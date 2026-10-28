// The companion's chat with one coachee, rendered from stored messages. Stands in for Slack or
// Teams when the Slack app isn't connected; answers go through the same handlers as Slack.
import { BotMessage, DayDivider, DmFrame } from '@/components/chat';
import { ChatMessageBody, TestControls } from '@/components/companion-chat-client';
import { db } from '@/lib/db';
import { slackEnabled, teamsReady } from '@/lib/companion/send';
import { buildView, withDayLabels } from '@/lib/companion/view';
import { asJson } from '@/lib/format';

export async function CompanionChat({ coacheeId, note }: { coacheeId: string; note?: string }) {
  const user = await db.user.findUniqueOrThrow({ where: { id: coacheeId } });
  const channel = asJson<string[]>(user.nudgeChannelOrder)[0] === 'teams' ? 'Teams' : 'Slack';
  const messages = await db.companionMessage.findMany({ where: { recipientId: coacheeId }, orderBy: [{ sentAt: 'asc' }, { id: 'asc' }] });
  const views = withDayLabels(await Promise.all(messages.map(buildView)));
  const delivered = messages.filter((m) => m.deliveredVia === channel.toLowerCase()).length;
  const connected = channel === 'Slack' ? slackEnabled() : await teamsReady(user.id);
  const testUser = channel === 'Slack' ? Boolean(process.env.SLACK_TEST_USER_ID) : true;
  const status = connected
    ? `Connected to ${channel}: new messages for ${user.name} are delivered there too${testUser ? ' (to the test user)' : ''}, and answers from either place update the same records.`
    : `Simulated ${channel} chat for ${user.name}. Buttons work and update the same records the coach sees. Connect the ${channel} app to deliver these to real ${channel}.`;

  return (
    <DmFrame app={channel} note={note ?? status} after={<TestControls coacheeId={coacheeId} delivered={delivered} app={channel} />}>
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
