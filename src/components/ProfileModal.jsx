import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { X, User, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

const PRESET_AVATAR_GROUPS = [
  {
    key: "humans",
    labelKey: "avatar_group_humans",
    items: [
      "/avatars/avatar-human-1.png",
      "/avatars/avatar-human-2.png",
      "/avatars/avatar-human-3.png",
      "/avatars/avatar-human-4.png",
    ],
  },
  {
    key: "fictional",
    labelKey: "avatar_group_fictional",
    items: [
      "/avatars/avatar-fiction-1.png",
      "/avatars/avatar-fiction-2.png",
      "/avatars/avatar-fiction-3.png",
      "/avatars/avatar-fiction-4.png",
    ],
  },
];

export default function ProfileModal({ isOpen, onClose, user, isPro }) {
  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name || "",
  );
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(
    user?.user_metadata?.avatar_url || "",
  );
  const [uploading, setUploading] = useState(false);
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const updates = {};
    const nextData = {};
    if (fullName.trim()) nextData.full_name = fullName.trim();
    if (avatarUrl) nextData.avatar_url = avatarUrl;
    if (Object.keys(nextData).length > 0) updates.data = nextData;
    if (password) updates.password = password;
    const { error } = await supabase.auth.updateUser(updates);
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      if (fullName.trim() && user?.id) {
        const { error: profileError } = await supabase
          .from("user_profiles")
          .update({ full_name: fullName.trim() })
          .eq("user_id", user.id);
        if (profileError) {
          setMessage({ type: "error", text: profileError.message });
          setLoading(false);
          return;
        }
      }
      setMessage({
        type: "success",
        text: password ? t("password_changed") : t("profile_updated"),
      });
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    }
    setLoading(false);
  };

  const ensureSession = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) {
      setMessage({ type: "error", text: t("auth_session_missing") });
      return false;
    }
    return true;
  };

  const handleSelectPreset = async (url) => {
    if (!(await ensureSession())) return;
    setAvatarUrl(url);
    setUploading(true);
    const { error } = await supabase.auth.updateUser({
      data: { avatar_url: url },
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: t("avatar_updated") });
    }
    setUploading(false);
  };

  const handleRemoveAvatar = async () => {
    if (!(await ensureSession())) return;
    setUploading(true);
    const { error } = await supabase.auth.updateUser({
      data: { avatar_url: "" },
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setAvatarUrl("");
      setMessage({ type: "success", text: t("avatar_removed") });
    }
    setUploading(false);
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;
    if (!(await ensureSession())) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: t("avatar_too_large") });
      return;
    }
    setUploading(true);
    setMessage(null);
    const fileExt = file.name.split(".").pop() || "png";
    const path = `${user.id}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setMessage({ type: "error", text: t("avatar_upload_error") });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data?.publicUrl || "";
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl },
    });
    if (updateError) {
      setMessage({ type: "error", text: updateError.message });
    } else {
      setAvatarUrl(publicUrl);
      setMessage({ type: "success", text: t("avatar_updated") });
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-neutral-800/80 radius-card p-6 shadow-apple border border-white/5 relative backdrop-blur-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white"
        >
          <X size={24} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-neutral-900 border border-white/5 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={18} className="text-neutral-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {t("profile_title")}
            </h2>
            <p className="text-xs text-neutral-500">{user?.email}</p>
          </div>
        </div>
        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${message.type === "error" ? "bg-red-900/30 text-red-300" : "bg-emerald-900/30 text-emerald-300"}`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdate} className="premium-divider">
          <div className="premium-divider">
            <label className="block text-sm text-neutral-400 mb-1">
              {t("avatar_title")}
            </label>
            <div className="premium-divider">
              {PRESET_AVATAR_GROUPS.map((group) => (
                <div key={group.key} className="premium-divider">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                    {t(group.labelKey)}
                  </p>
                  <div className="grid grid-cols-6 gap-2">
                    {group.items.map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => handleSelectPreset(src)}
                        className={`h-12 w-12 rounded-xl border ${avatarUrl === src ? "border-white/40" : "border-white/5"} overflow-hidden`}
                        disabled={uploading}
                      >
                        <img
                          src={src}
                          alt="preset"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer rounded-xl bg-neutral-900 border border-neutral-800/60 px-4 py-2 text-xs text-neutral-300 flex items-center justify-center gap-2">
                <Upload size={14} />
                {uploading ? t("avatar_uploading") : t("avatar_upload")}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="rounded-xl bg-neutral-900 border border-neutral-800/60 px-3 py-2 text-xs text-neutral-300 flex items-center justify-center"
                disabled={uploading || !avatarUrl}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <p className="text-[10px] text-neutral-500 flex items-center gap-1">
              <ImageIcon size={12} /> {t("avatar_hint")}
            </p>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              {t("display_name")}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800/60 rounded-xl px-4 py-2 text-white focus:border-neutral-400/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              {t("new_password")}
            </label>
            <input
              type="password"
              placeholder={t("password_placeholder_settings")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800/60 rounded-xl px-4 py-2 text-white focus:border-neutral-400/50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-neutral-200 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? t("saving") : t("save_changes")}
          </button>
        </form>
      </div>
    </div>
  );
}
