import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import { AuthUser, createEvent } from "../services/apiClient";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  price: z.coerce.number().gt(0, "Price must be greater than 0"),
});

type FormValues = z.infer<typeof schema>;

type EventFormPageProps = {
  currentUser: AuthUser;
};

export default function EventFormPage({ currentUser }: EventFormPageProps) {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      price: 1,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createEvent(currentUser, values);
      toast.success("Event saved");
      navigate("/events");
    } catch {
      toast.error("Failed to save event");
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography component="h1" variant="h4" gutterBottom>
        Create Event
      </Typography>

      <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
        <TextField
          label="Title"
          {...register("title")}
          error={Boolean(errors.title)}
          helperText={errors.title?.message}
        />
        <TextField
          label="Description"
          {...register("description")}
          error={Boolean(errors.description)}
          helperText={errors.description?.message}
        />
        <TextField
          label="Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          {...register("date")}
          error={Boolean(errors.date)}
          helperText={errors.date?.message}
        />
        <TextField
          label="Price"
          type="number"
          inputProps={{ min: 0.01, step: 0.01 }}
          {...register("price")}
          error={Boolean(errors.price)}
          helperText={errors.price?.message}
        />
        <Stack direction="row" spacing={1}>
          <Button variant="contained" type="submit" disabled={isSubmitting}>
            Save
          </Button>
          <Button variant="outlined" onClick={() => navigate("/events")}>
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
