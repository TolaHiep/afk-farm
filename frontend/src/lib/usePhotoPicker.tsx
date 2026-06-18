import React from "react";
import { MAX_PHOTOS } from "./image";

// Hook quan ly chon nhieu anh: giu File goc + thumbnail object URL, tran MAX_PHOTOS.
export function usePhotoPicker() {
  const [files, setFiles] = React.useState<File[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const thumbs = React.useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  React.useEffect(() => () => thumbs.forEach((u) => URL.revokeObjectURL(u)), [thumbs]);

  const open = () => inputRef.current?.click();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = ""; // cho phep chon lai cung file
    setFiles((prev) => {
      const next = [...prev, ...picked];
      if (next.length > MAX_PHOTOS) {
        alert(`Chỉ được tối đa ${MAX_PHOTOS} ảnh.`);
      }
      return next.slice(0, MAX_PHOTOS);
    });
  };

  const removeAt = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));
  const clear = () => setFiles([]);

  // Spread vao <input {...inputProps} /> de tranh dinh nghia component long nhau.
  const inputProps = {
    ref: inputRef,
    type: "file" as const,
    accept: "image/*",
    multiple: true,
    hidden: true,
    onChange,
  };

  return { files, thumbs, open, removeAt, clear, inputProps };
}
