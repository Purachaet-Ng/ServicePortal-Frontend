import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDepartments } from "@/api/departments.api";
import {
  checkInEvent,
  createEvent,
  deleteEvent,
  getEvent,
  getEventInvitees,
  getEventQr,
  getEvents,
  inviteAttendees,
  rsvpEvent,
  updateEvent,
} from "@/api/events.api";

const refreshEvents = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: ["events"] });

export const useEventDepartments = () =>
  useQuery({
    queryKey: ["departments", "list"],
    queryFn: getDepartments,
    select: (response) => response?.departments ?? [],
  });

export const useEventInvitees = (departmentId) =>
  useQuery({
    queryKey: ["events", "invitees", Number(departmentId)],
    queryFn: () => getEventInvitees(Number(departmentId)),
    select: (response) => response?.users ?? [],
    enabled: Boolean(departmentId),
  });

export const useEvents = (params = {}) =>
  useQuery({
    queryKey: ["events", "list", params],
    queryFn: () => getEvents(params),
    select: (response) => response?.events ?? [],
  });

export const useEvent = (id) =>
  useQuery({
    queryKey: ["events", Number(id)],
    queryFn: () => getEvent(id),
    select: (response) => response?.event ?? null,
    enabled: Boolean(id),
  });

export const useEventQr = (id, enabled = true) =>
  useQuery({
    queryKey: ["events", Number(id), "qr"],
    queryFn: () => getEventQr(id),
    select: (response) => response?.token ?? null,
    enabled: Boolean(id) && enabled,
    retry: false,
  });

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => refreshEvents(queryClient),
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }) => updateEvent(id, body),
    onSuccess: () => refreshEvents(queryClient),
  });
};

export const useCancelEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => refreshEvents(queryClient),
  });
};

export const useRsvpEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rsvpStatus }) =>
      rsvpEvent(id, { rsvpStatus }),
    onSuccess: () => refreshEvents(queryClient),
  });
};

export const useInviteAttendees = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userIds }) =>
      inviteAttendees(id, { userIds }),
    onSuccess: () => refreshEvents(queryClient),
  });
};

export const useCheckInEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // body contains either token or userId.
    mutationFn: ({ id, ...body }) => checkInEvent(id, body),
    onSuccess: () => refreshEvents(queryClient),
  });
};
