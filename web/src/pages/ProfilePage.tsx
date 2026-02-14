import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import { getProfile, updateProfile } from "../services/apiClient";

const phoneRegex = /^(\(\d{2}\)\s\d{5}-\d{4}|\d{11})$/;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z
    .string()
    .regex(phoneRegex, "Phone must be (11) 99999-9999 or 11999999999"),
});

type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getProfile();
        reset(profile);
      } catch {
        toast.error("Failed to load profile");
      }
    }

    void loadProfile();
  }, [reset]);

  async function onSubmit(values: FormValues) {
    try {
      await updateProfile(values);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography component="h1" variant="h4" gutterBottom>
        Profile
      </Typography>
      <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Name"
          {...register("name")}
          error={Boolean(errors.name)}
          helperText={errors.name?.message}
        />
        <TextField
          label="Email"
          {...register("email")}
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
        />
        <TextField
          label="Phone"
          {...register("phone")}
          error={Boolean(errors.phone)}
          helperText={errors.phone?.message}
        />
        <Stack direction="row" spacing={1}>
          <Button variant="contained" type="submit" disabled={isSubmitting}>
            Save
          </Button>
          <Button variant="outlined" onClick={() => navigate("/events")}>
            Back to Events
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
