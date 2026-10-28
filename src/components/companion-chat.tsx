// The companion's chat with one coachee, rendered from stored messages. Stands in for Slack or
// Teams when the Slack app isn't connected; answers go through the same handlers as Slack.
import { BotMessage, DayDivider, DmFrame } from '@/components/chat';
import { ChatMessageBody, TestControls } from '@/components/companion-chat-client';
import { db } from '@/lib/db';
import { slackEnabled } from '@/lib/companion/send';
import { buildView, withDayLabels } from '@/lib/companion/view';
import { asJson } from '@/lib/format';

export async function CompanionChat({ coacheeId, note }: { coacheeId: string; note?: string }) {
  const user = await db.user.findUniqueOrThrow({ where: { id: coacheeId } });
  const channel = asJson<string[]>(user.nudgeChannelOrder)[0] === 'teams' ? 'Teams' : 'Slack';
  const messages = await db.companionMessage.findMany({ where: { recipientId: coacheeId }, orderBy: [{ sentAt: 'asc' }, { id: 'asc' }] });
  const views = withDayLabels(await Promise.all(messages.map(buildView)));
  const inSlack = messages.filter((m) => m.deliveredVia === 'slack').length;
  const status = channel === 'Slack' && slackEnabled()
    ? `Connected to Slack: new messages for ${user.name} are delivered there too${process.env.SLACK_TEST_USER_ID ? ' (to the test user)' : ''}, and answers from either place update the same records.`
    : `Simulated ${channel} chat for ${user.name}. Buttons work and update the same records the coach sees.${channel === 'Slack' ? ' Connect the Slack app to deliver these to real Slack.' : ' Teams delivery is a later milestone.'}`;

  return (
    <DmFrame app={channel} note={note ?? status} after={<TestControls coacheeId={coacheeId} sentToSlack={inSlack} />}>
      {views.length === 0 ? <p className="text-body text-subtle">No messages yet. Use the prototype controls below to send one.</p> : null}
      {views.map((v) => (
        <div key={v.id} className="stack stack--200">
          {v.divider ? <DayDivider>{v.divider}</DayDivider> : null}
          <BotMessage meta={v.meta}>
            <ChatMessageBody view={v} />
          </BotMessage>
        </div>
      ))}
    </DmFrame>
  );
}
