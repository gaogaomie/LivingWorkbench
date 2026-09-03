import type {
  CreateHabit,
  CreateMediaItem,
  CreateShoppingItem,
  CreateTodo,
  EditMediaItem,
  FitnessLogInput,
  FitnessProfileInput,
  SessionResponse,
  ShoppingItem,
  TimelineSource,
  TodoStatus,
  TrashSource,
  UpdateFitnessLog,
  UpdateHabit,
  UpdateShoppingItem,
  UpdateTodo,
} from "@daily-life/shared";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fitnessService } from "../services/fitness.service";
import { habitService } from "../services/habit.service";
import { lifeArchiveService } from "../services/life-archive.service";
import { type MediaCoverData, mediaService } from "../services/media.service";
import { scheduleService } from "../services/schedule.service";
import { shoppingService } from "../services/shopping.service";
import { queryKeys } from "./query-keys";

function useCsrfToken(): string {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<SessionResponse>(queryKeys.authSession)?.csrfToken ?? "";
}

export function useHabits(date: string) {
  return useQuery({
    queryKey: queryKeys.habits(date),
    queryFn: () => habitService.getDay(date),
  });
}

export function useHabitMutations(date: string) {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.habits(date) }),
      queryClient.invalidateQueries({ queryKey: ["timeline"] }),
      queryClient.invalidateQueries({ queryKey: ["overview"] }),
    ]);
  const create = useMutation({
    mutationFn: (input: CreateHabit) => habitService.create(input, csrfToken),
    onSuccess: refresh,
  });
  const progress = useMutation({
    mutationFn: (input: { id: string; value: number }) =>
      habitService.setProgress({ ...input, date }, csrfToken),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: (input: UpdateHabit & { id: string }) => habitService.update(input, csrfToken),
    onSuccess: refresh,
  });
  const status = useMutation({
    mutationFn: (input: { id: string; status: "active" | "paused" | "archived" }) =>
      habitService.setStatus(input, csrfToken),
    onSuccess: refresh,
  });
  return { create, update, progress, status };
}

export function useFitness(today: string) {
  return useQuery({
    queryKey: queryKeys.fitness(today),
    queryFn: () => fitnessService.get(today),
  });
}

export function useFitnessMutations(today: string) {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.fitness(today) }),
      queryClient.invalidateQueries({ queryKey: ["timeline"] }),
      queryClient.invalidateQueries({ queryKey: ["overview"] }),
    ]);
  return {
    saveProfile: useMutation({
      mutationFn: (input: FitnessProfileInput) => fitnessService.saveProfile(input, csrfToken),
      onSuccess: refresh,
    }),
    saveLog: useMutation({
      mutationFn: (input: FitnessLogInput) => fitnessService.saveLog(input, csrfToken),
      onSuccess: refresh,
    }),
    updateLog: useMutation({
      mutationFn: (input: UpdateFitnessLog & { id: string }) =>
        fitnessService.updateLog(input, csrfToken),
      onSuccess: refresh,
    }),
  };
}

export function useSchedule(today: string) {
  return useQuery({
    queryKey: queryKeys.schedule(today),
    queryFn: () => scheduleService.get(today),
  });
}

function formatLocalMinute(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function useDueReminders() {
  return useQuery({
    queryKey: queryKeys.dueReminders,
    queryFn: () => {
      const now = new Date();
      const from = formatLocalMinute(new Date(now.getTime() - 2 * 60_000));
      const to = formatLocalMinute(now);
      return scheduleService.getDueReminders(from, to);
    },
    refetchInterval: 60_000,
    staleTime: 0,
  });
}

export function useScheduleMutations(today: string) {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule(today) }),
      queryClient.invalidateQueries({ queryKey: ["timeline"] }),
      queryClient.invalidateQueries({ queryKey: ["overview"] }),
    ]);
  return {
    create: useMutation({
      mutationFn: (input: CreateTodo) => scheduleService.create(input, csrfToken),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: (input: UpdateTodo & { id: string }) => scheduleService.update(input, csrfToken),
      onSuccess: refresh,
    }),
    status: useMutation({
      mutationFn: (input: { id: string; status: TodoStatus }) =>
        scheduleService.setStatus(input, csrfToken),
      onSuccess: refresh,
    }),
  };
}

export function useShopping(month: string) {
  return useQuery({
    queryKey: queryKeys.shopping(month),
    queryFn: () => shoppingService.get(month),
  });
}

export function useShoppingMutations(month: string) {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.shopping(month) }),
      queryClient.invalidateQueries({ queryKey: ["timeline"] }),
      queryClient.invalidateQueries({ queryKey: ["overview"] }),
    ]);
  return {
    create: useMutation({
      mutationFn: (input: CreateShoppingItem) => shoppingService.create(input, csrfToken),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: (input: UpdateShoppingItem & { id: string }) =>
        shoppingService.update(input, csrfToken),
      onSuccess: refresh,
    }),
    status: useMutation({
      mutationFn: (input: {
        item: ShoppingItem;
        status: "wanted" | "purchased";
        purchasedOn: string | null;
      }) => shoppingService.setStatus(input, csrfToken),
      onSuccess: refresh,
    }),
  };
}

export function useMedia(year: string) {
  return useQuery({
    queryKey: queryKeys.media(year),
    queryFn: () => mediaService.get(year),
  });
}

export type { MediaCoverData };

export function useMediaCover(assetId: string | null) {
  return useQuery({
    queryKey: ["media-cover", assetId],
    queryFn: () => mediaService.getCover(assetId as string),
    enabled: assetId !== null,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function mediaCoverDataUrl(cover: MediaCoverData): string {
  return `data:${cover.mimeType};base64,${cover.contentBase64}`;
}

export function useMediaMutations(year: string) {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.media(year) }),
      queryClient.invalidateQueries({ queryKey: ["timeline"] }),
    ]);
  return {
    create: useMutation({
      mutationFn: (input: CreateMediaItem) => mediaService.create(input, csrfToken),
      onSuccess: refresh,
    }),
    edit: useMutation({
      mutationFn: (input: EditMediaItem & { id: string }) => mediaService.edit(input, csrfToken),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: (input: {
        id: string;
        status: "wishlist" | "in_progress" | "completed" | "paused";
        rating: number | null;
        completedOn: string | null;
      }) => mediaService.updateStatus(input, csrfToken),
      onSuccess: refresh,
    }),
    uploadCover: useMutation({
      mutationFn: (input: { id: string; file: File }) => mediaService.uploadCover(input, csrfToken),
      onSuccess: refresh,
    }),
    removeCover: useMutation({
      mutationFn: (id: string) => mediaService.removeCover(id, csrfToken),
      onSuccess: refresh,
    }),
  };
}

export function useTimeline(filters: {
  from?: string | undefined;
  to?: string | undefined;
  source?: TimelineSource | undefined;
}) {
  return useInfiniteQuery({
    queryKey: queryKeys.timeline(filters),
    initialPageParam: "",
    queryFn: ({ pageParam }) => lifeArchiveService.getTimeline(filters, pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useOverview(date: string) {
  return useQuery({
    queryKey: queryKeys.overview(date),
    queryFn: () => lifeArchiveService.getOverview(date),
  });
}

export function useTrash() {
  return useQuery({
    queryKey: queryKeys.trash,
    queryFn: lifeArchiveService.getTrash,
  });
}

export function useTrashMutations() {
  const queryClient = useQueryClient();
  const csrfToken = useCsrfToken();
  const refresh = () =>
    Promise.all(
      [
        "finance",
        "habits",
        "fitness",
        "schedule",
        "shopping",
        "media",
        "timeline",
        "overview",
        "trash",
      ].map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    );
  return {
    remove: useMutation({
      mutationFn: (input: { source: TrashSource; id: string; expectedUpdatedAt: string }) =>
        lifeArchiveService.removeTrash(input, csrfToken),
      onSuccess: refresh,
    }),
    restore: useMutation({
      mutationFn: (input: { source: TrashSource; id: string; expectedDeletedAt: string }) =>
        lifeArchiveService.restoreTrash(input, csrfToken),
      onSuccess: refresh,
    }),
  };
}
