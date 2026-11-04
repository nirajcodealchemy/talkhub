"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { userRegex } from "@/src/utils/regex";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
};

export default function EditProfileModal({ isOpen, onClose, userId }: Props) {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [oldName, setOldName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen || !userId) return;

    let active = true;

    async function fetchProfile() {
      setFetching(true);
      setError("");

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", userId)
        .single();

      if (!active) return;

      if (error) {
        setError(error.message);
      } else {
        setName(data.full_name ?? "");
        setOldName(data.full_name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      }

      setFetching(false);
    }

    fetchProfile();

    return () => {
      active = false;
    };
  }, [isOpen, userId]);

  useEffect(() => {
    if (!selectedFile) {
      setPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  if (!isOpen) return null;

  const handleFileChange = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      return;
    }

    setError("");
    setSelectedFile(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!userRegex.test(name.trim())) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      let finalAvatarUrl = avatarUrl;

      if (selectedFile) {
        const extension = selectedFile.name.split(".").pop() || "jpg";
        const filePath = `${userId}/avatar-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, selectedFile, {
            upsert: true,
            contentType: selectedFile.type,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        finalAvatarUrl = data.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          avatar_url: finalAvatarUrl,
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(finalAvatarUrl);
      setSelectedFile(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
      ]);

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update profile.",
      );
    } finally {
      setLoading(false);
    }
  };

  const isNameValid = userRegex.test(name.trim());

  const nameError = !isNameValid
    ? name.trim().length === 0
      ? "Name is required."
      : "Name must start with a letter and contain at least 3 characters. Only letters, numbers and spaces are allowed."
    : "";

  const displayedAvatar = preview || avatarUrl;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Edit Profile
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="cursor-pointer rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent"
          >
            <X size={20} />
          </button>
        </div>

        {fetching ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-chart-4" />
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-col items-center">
              <div
                className="relative cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <img
                  src={
                    displayedAvatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=6545db&color=fff`
                  }
                  alt="Profile"
                  className="h-24 w-24 rounded-full border-4 border-gray-100 object-cover"
                />

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-chart-4 p-2 text-white shadow-md transition-colors hover:bg-chart-5"
                >
                  <Camera size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 cursor-pointer text-sm font-medium text-chart-4 transition-colors hover:text-chart-5"
              >
                Change profile photo
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => handleFileChange(event.target.files?.[0])}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Full Name
              </label>

              <input
                id="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                placeholder="Enter your name"
                maxLength={80}
                className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors ${
                  nameError
                    ? "border-destructive focus:border-destructive"
                    : "border-gray-200 focus:border-chart-4"
                }`}
              />

              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={
                  loading || fetching || !isNameValid || name === oldName
                }
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-chart-4 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-chart-5 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
