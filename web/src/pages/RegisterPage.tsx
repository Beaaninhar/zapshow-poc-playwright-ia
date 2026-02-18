import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import { registerUser } from "../services/apiClient";

const schema = z.object({
  name: z.string().min(3, "Name must have at least 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must have at least 6 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await registerUser({ ...values, role: "USER" });
      toast.success("Account created successfully");
      navigate("/login");
    } catch (error) {
      if (error instanceof Error && error.message.includes("email already exists")) {
        toast.error("Email already exists");
        return;
      }

      toast.error("Failed to create account");
    }
  }

  return (
    <Container id="page-register" data-page-name="register-page" maxWidth="sm" sx={{ py: 6 }}>
      <Typography component="h1" variant="h4" gutterBottom>
        Create Account
      </Typography>
      <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
        <TextField
          id="register-name"
          label="Name"
          {...register("name")}
          error={Boolean(errors.name)}
          helperText={errors.name?.message}
        />
        <TextField
          id="register-email"
          label="Email"
          type="email"
          {...register("email")}
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
        />
        <TextField
          id="register-password"
          label="Password"
          type="password"
          {...register("password")}
          error={Boolean(errors.password)}
          helperText={errors.password?.message}
        />
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          Save
        </Button>
        <Button component={Link} to="/login" variant="text">
          Back to Login
        </Button>
      </Stack>
    </Container>
  );
}
