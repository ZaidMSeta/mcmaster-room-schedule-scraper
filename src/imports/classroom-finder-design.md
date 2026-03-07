Revise this university empty-classroom finder design so the main interaction is a structured sentence-style query builder, not a traditional search bar plus filter form.

This should NOT feel like natural language chat or a freeform AI input.
It should feel like one fixed sentence template with editable slots.

Primary interaction model:
“Find me a room in [Any building] on [Today] that is free [Right now].”

Important requirements:
- one fixed sentence structure
- editable parts should be chips, pills, dropdown triggers, segmented controls, or time pickers
- the sentence should remain structured and unambiguous
- no freeform text input as the main interaction
- no traditional stacked filter form as the homepage focal point
- minimal typing
- fast to use while walking around campus
- large tap targets on mobile
- practical, utility-first feel

Supported query variations should come from the same sentence structure:
- Find me a room in [Any building] on [Today] that is free [Right now]
- Find me a room in [BSB] on [Tuesday] that is free [from 2:30 PM to 4:30 PM]
- Find me a room in [Any building] on [Friday] that is free [for at least 1 hour]
- Find me a room in [ABB] on [Monday] that is free [for at least 2 hours starting at 11:30 AM]

Required editable slots:
- building
- day
- availability mode

Availability modes:
- right now
- from [start time] to [end time]
- for at least [duration]
- for at least [duration] starting at [time]

Design goals:
- practical student tool
- calm, efficient, modern academic utility feel
- clean spacing and strong hierarchy
- very readable on mobile
- polished but not flashy
- compact enough to scan quickly

Keep the existing visual style:
- warm neutral background
- white or cream cards
- dark slate text
- restrained teal accent
- soft borders
- soft shadows
- rounded corners

Homepage requirements:
- header with app name and short subtitle
- sentence-style query builder as the focal point
- optional suggestion chips under the builder
- prominent Show rooms button
- very fast Free now shortcut
- small disclaimer that results are based on timetable data and may not reflect real-time occupancy

Results page requirements:
- keep the current room-card style and schedule strips
- replace the traditional top search/filter area with a compact editable sentence-builder summary bar
- allow the query to be edited from that bar while preserving the same sentence structure
- do not revert to a standard search bar + filter layout

Create these states:
- default state before a search
- filled-out query state
- results state with multiple room cards
- no results state
- loading state
- error state
- free now shortcut state
- mobile responsive version