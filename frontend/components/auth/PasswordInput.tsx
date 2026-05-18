"use client";

import { useState } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
};

export default function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  required = false,
  id = "password"
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={id.includes("login") ? "current-password" : "new-password"}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
