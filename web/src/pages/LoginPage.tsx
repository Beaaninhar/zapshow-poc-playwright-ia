import { Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { login } from "../services/apiClient";

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    setLoading(true);
    try {
      await login(email, password);
      navigate("/events");
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography component="h1" variant="h4" gutterBottom>
        Login
      </Typography>
      <Stack component="form" spacing={2} onSubmit={handleSubmit}>
        <TextField label="Email" name="email" type="email" fullWidth required />
        <TextField
          label="Password"
          name="password"
          type="password"
          fullWidth
          required
        />
        <Button type="submit" variant="contained" disabled={loading}>
          Login
        </Button>
      </Stack>
    </Container>
  );
}
