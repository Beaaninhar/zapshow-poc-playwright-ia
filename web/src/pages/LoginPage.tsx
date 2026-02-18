import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import { AuthUser, login } from "../services/apiClient";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must have at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

type LoginPageProps = {
  onLogin: (user: AuthUser) => void;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      const user = await login(values.email, values.password);
      onLogin(user);
      navigate("/events");
    } catch {
      toast.error("Invalid credentials");
    }
  }

  return (
    <Container id="page-login" data-page-name="login-page" maxWidth="sm" sx={{ py: 6 }}>
      <Typography component="h1" variant="h4" gutterBottom>
        Login
      </Typography>
      <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Email"
          type="email"
          {...register("email")}
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
        />
        <TextField
          label="Password"
          type="password"
          {...register("password")}
          error={Boolean(errors.password)}
          helperText={errors.password?.message}
        />
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          Login
        </Button>
        <Button component={Link} to="/register" variant="text">
          Create Account
        </Button>
      </Stack>
    </Container>
  );
}
