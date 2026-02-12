# Page snapshot

```yaml
- main [ref=e3]:
  - heading "Events" [level=1] [ref=e4]
  - form "create-event-form" [ref=e5]:
    - generic [ref=e6]:
      - text: Title
      - textbox "Title" [ref=e7]: qa@empresa.com
    - generic [ref=e8]:
      - text: Description
      - textbox "Description" [ref=e9]: "123456"
    - button "Create Event" [active] [ref=e10]
  - list
```