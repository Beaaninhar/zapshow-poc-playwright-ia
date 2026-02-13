import {
  Button,
  Container,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { deleteEvent, EventRecord, listEvents } from "../services/apiClient";

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRecord[]>([]);

  async function fetchEvents() {
    try {
      const data = await listEvents();
      setEvents(data);
    } catch {
      toast.error("Failed to load events");
    }
  }

  useEffect(() => {
    void fetchEvents();
  }, []);

  async function handleDelete(id: number) {
    try {
      await deleteEvent(String(id));
      await fetchEvents();
      toast.success("Event deleted");
    } catch {
      toast.error("Failed to delete event");
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography component="h1" variant="h4">
          Events
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate("/profile")}>
            Profile
          </Button>
          <Button variant="contained" onClick={() => navigate("/events/new")}>
            Create Event
          </Button>
        </Stack>
      </Stack>

      {!events.length ? (
        <Typography>No events</Typography>
      ) : (
        <List>
          {events.map((event) => (
            <ListItem
              key={event.id}
              divider
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <Button onClick={() => navigate(`/events/${event.id}/edit`)}>Edit</Button>
                  <Button color="error" onClick={() => handleDelete(event.id)}>
                    Delete
                  </Button>
                </Stack>
              }
            >
              <ListItemText
                primary={event.title}
                secondary={`${event.description || "No description"} • ${event.date} • $${event.price}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  );
}
