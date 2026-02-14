import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import { createEvent, listEvents, updateEvent } from "../services/apiClient";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  price: z.coerce.number().gt(0, "Price must be greater than 0"),
});

type FormValues = z.infer<typeof schema>;

export default function EventFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      price: 1,
    },
  });

  useEffect(() => {
    async function loadEvent() {
      if (!id) return;
      try {
        const events = await listEvents();
        const event = events.find((item) => String(item.id) === id);
        if (!event) {
          toast.error("Event not found");
          navigate("/events");
          return;
        }
        reset(event);
      } catch {
        toast.error("Failed to load event");
        navigate("/events");
      }
    }

    void loadEvent();
  }, [id, navigate, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (id) {
        await updateEvent(id, values);
      } else {
        await createEvent(values);
      }
      toast.success("Event saved");
      navigate("/events");
    } catch {
      toast.error("Failed to save event");
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography component="h1" variant="h4" gutterBottom>
        {isEdit ? "Edit Event" : "Create Event"}
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
          defaultValue={new Date().toISOString().split("T")[0]}
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
