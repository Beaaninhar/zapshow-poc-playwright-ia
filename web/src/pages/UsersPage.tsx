import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import {
  AuthUser,
  UserRecord,
  deleteUser,
  listUsers,
  registerUser,
  updateUser,
} from "../services/apiClient";

const userSchema = z.object({
  name: z.string().min(3, "Name must have at least 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must have at least 6 characters"),
  role: z.enum(["MASTER", "USER"]),
});

type UserFormValues = z.infer<typeof userSchema>;

type UsersPageProps = {
  currentUser: AuthUser;
  onLogout: () => void;
};

export default function UsersPage({ currentUser, onLogout }: UsersPageProps) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const createForm = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "USER",
    },
  });

  const editForm = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
  });

  async function loadUsers() {
    try {
      const data = await listUsers(currentUser);
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function onCreate(values: UserFormValues) {
    try {
      await registerUser(values);
      toast.success("User created");
      createForm.reset();
      await loadUsers();
    } catch (error) {
      if (error instanceof Error && error.message.includes("email already exists")) {
        toast.error("Email already exists");
        return;
      }
      toast.error("Failed to create user");
    }
  }

  async function onEdit(values: UserFormValues) {
    if (!editingUser) return;

    try {
      await updateUser(currentUser, editingUser.id, values);
      toast.success("User updated");
      setEditingUser(null);
      await loadUsers();
    } catch (error) {
      if (error instanceof Error && error.message.includes("email already exists")) {
        toast.error("Email already exists");
        return;
      }
      toast.error("Failed to update user");
    }
  }

  async function handleDelete(user: UserRecord) {
    if (user.role === "MASTER") {
      toast.error("Master users cannot be deleted");
      return;
    }

    try {
      await deleteUser(currentUser, user.id);
      toast.success("User deleted");
      await loadUsers();
    } catch {
      toast.error("Failed to delete user");
    }
  }

  function openEdit(user: UserRecord) {
    setEditingUser(user);
    editForm.reset({
      name: user.name,
      email: user.email,
      password: "123456",
      role: user.role,
    });
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography component="h1" variant="h4">
          Users
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate("/events")}>
            Back to Events
          </Button>
          <Button variant="text" onClick={onLogout}>
            Logout
          </Button>
        </Stack>
      </Stack>

      <Typography variant="h6" gutterBottom>
        Create User
      </Typography>
      <Stack
        component="form"
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        onSubmit={createForm.handleSubmit(onCreate)}
        mb={3}
      >
        <TextField
          label="Name"
          {...createForm.register("name")}
          error={Boolean(createForm.formState.errors.name)}
          helperText={createForm.formState.errors.name?.message}
        />
        <TextField
          label="Email"
          {...createForm.register("email")}
          error={Boolean(createForm.formState.errors.email)}
          helperText={createForm.formState.errors.email?.message}
        />
        <TextField
          label="Password"
          type="password"
          {...createForm.register("password")}
          error={Boolean(createForm.formState.errors.password)}
          helperText={createForm.formState.errors.password?.message}
        />
        <TextField select label="Role" defaultValue="USER" {...createForm.register("role")}>
          <MenuItem value="USER">USER</MenuItem>
          <MenuItem value="MASTER">MASTER</MenuItem>
        </TextField>
        <Button type="submit" variant="contained" disabled={createForm.formState.isSubmitting}>
          Save
        </Button>
      </Stack>

      <List>
        {users.map((user) => (
          <ListItem
            key={user.id}
            divider
            secondaryAction={
              <Stack direction="row" spacing={1}>
                <Button onClick={() => openEdit(user)}>Edit</Button>
                <Button color="error" onClick={() => handleDelete(user)}>
                  Delete
                </Button>
              </Stack>
            }
          >
            <ListItemText
              primary={`${user.name} (${user.role})`}
              secondary={`${user.email} • Events created: ${user.eventsCount}`}
            />
          </ListItem>
        ))}
      </List>

      <Dialog open={Boolean(editingUser)} onClose={() => setEditingUser(null)} fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              {...editForm.register("name")}
              error={Boolean(editForm.formState.errors.name)}
              helperText={editForm.formState.errors.name?.message}
            />
            <TextField
              label="Email"
              {...editForm.register("email")}
              error={Boolean(editForm.formState.errors.email)}
              helperText={editForm.formState.errors.email?.message}
            />
            <TextField
              label="Password"
              type="password"
              {...editForm.register("password")}
              error={Boolean(editForm.formState.errors.password)}
              helperText={editForm.formState.errors.password?.message}
            />
            <TextField select label="Role" defaultValue="USER" {...editForm.register("role")}>
              <MenuItem value="USER">USER</MenuItem>
              <MenuItem value="MASTER">MASTER</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingUser(null)}>Cancel</Button>
          <Button onClick={editForm.handleSubmit(onEdit)} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
