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
import { AuthUser, EventRecord, listEvents } from "../services/apiClient";

type EventsPageProps = {
  currentUser: AuthUser;
  onLogout: () => void;
};

export default function EventsPage({ currentUser, onLogout }: EventsPageProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRecord[]>([]);

  async function fetchEvents() {
    try {
      const data = await listEvents(currentUser);
      setEvents(data);
    } catch {
      toast.error("Failed to load events");
    }
  }

  useEffect(() => {
    void fetchEvents();
  }, []);

  return (
    <Container id="page-events" data-page-name="events-page" maxWidth="md" sx={{ py: 6 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography component="h1" variant="h4">
          Events
        </Typography>
        <Stack direction="row" spacing={1}>
          {currentUser.role === "MASTER" && (
            <>
              <Button variant="outlined" onClick={() => navigate("/users")}>
                Users
              </Button>
              <Button variant="outlined" onClick={() => navigate("/tests")}>
                Tests
              </Button>
            </>
          )}
          <Button variant="contained" onClick={() => navigate("/events/new")}>
            Create Event
          </Button>
          <Button variant="text" onClick={onLogout}>
            Logout
          </Button>
        </Stack>
      </Stack>

      {!events.length ? (
        <Typography>No events</Typography>
      ) : (
        <List>
          {events.map((event) => (
            <ListItem key={event.id} divider>
              <ListItemText
                primary={event.title}
                secondary={`${event.description || "No description"} • ${event.date} • $${event.price.toFixed(2)}${
                  currentUser.role === "MASTER"
                    ? ` • Created by: ${event.createdByName}`
                    : ""
                }`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  );
}
