"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { uploadFile, getSignedUrl } from "@/lib/storage";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validations/settings";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Updates the current user's name and phone number. */
export async function updateProfileAction(input: UpdateProfileInput): Promise<ActionResult> {
  const currentUser = await requireUser();
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, phone } = parsed.data;

  await db.user.update({
    where: { id: currentUser.id },
    data: { name, phone: phone || null },
  });

  // Revalidate the profile page and the role layout (updates header name)
  revalidatePath(`/${roleToSlug(currentUser.role)}/profile`);
  revalidatePath(`/${roleToSlug(currentUser.role)}`);

  return { success: true, data: undefined };
}

/** Uploads a new avatar image and updates the user's image field. */
export async function uploadAvatarAction(formData: FormData): Promise<
  ActionResult<{ imageUrl: string }>
> {
  const currentUser = await requireUser();
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return { success: false, error: "Choose an image to upload" };
  }

  // Validate file type and size
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Upload a JPEG, PNG, WebP, or GIF image" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "Image must be under 5 MB" };
  }

  const ext = file.type.split("/")[1] ?? "jpg";
  const path = `avatars/${currentUser.id}.${ext}`;

  // Storage (Supabase buckets) is an optional feature — the env vars may be
  // unset. Fail gracefully with a user-facing message instead of letting the
  // throw escape the server action and blow up the page render.
  try {
    await uploadFile(path, file, file.type);

    // Generate a signed URL for the avatar (1 year expiry — avatars rarely change)
    const imageUrl = await getSignedUrl(path, 365 * 24 * 60 * 60);

    await db.user.update({
      where: { id: currentUser.id },
      data: { image: imageUrl },
    });

    revalidatePath(`/${roleToSlug(currentUser.role)}/profile`);
    revalidatePath(`/${roleToSlug(currentUser.role)}`);

    return { success: true, data: { imageUrl } };
  } catch (err) {
    const message = err instanceof Error && err.message.includes("storage is not configured")
      ? "Avatar uploads are not enabled on this server yet."
      : "Upload failed. Please try again.";
    return { success: false, error: message };
  }
}

function roleToSlug(role: string): string {
  const map: Record<string, string> = {
    GYM_OWNER: "owner",
    MEMBER: "member",
    TRAINER: "trainer",
    RECEPTIONIST: "reception",
    PLATFORM_SUPER_ADMIN: "admin",
  };
  return map[role] ?? "owner";
}
