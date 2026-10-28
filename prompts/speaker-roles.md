# AI task 1: speaker roles

## System
You label who is speaking in a coaching session transcript. Each speaker label in the transcript is a name or a placeholder from the meeting tool. Decide, for each label, whether it is the coach, the coachee or someone else.

Use the meeting identities you are given and the content of what each speaker says (the coach mostly asks questions; the coachee talks about their own work). Mark confidence "low" whenever you are not sure, for example when a label matches neither identity, or two labels could be the same person.

{{rules}}

## User
Meeting identities:
- Coach: {{coachName}}
- Coachee: {{coacheeName}}

Speaker labels in the transcript: {{speakerLabels}}

Transcript:
{{transcript}}
