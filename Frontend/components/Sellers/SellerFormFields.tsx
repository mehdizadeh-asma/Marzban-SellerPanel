import type { ReactElement } from "react";

import TextField from "@mui/material/TextField";
import { useFormContext } from "react-hook-form";

export type SellerFormValues = {
  Title: string;
  Limit: number;
  Username: string;
  Password: string;
  MarzbanUsername: string;
  MarzbanPassword: string;
};

type Props = {
  mode: "add" | "edit";
};

const minLengthRule = (field: string): { value: number; message: string } => ({
  value: 8,
  message: `${field} must be at least 8 characters.`,
});

export default function SellerFormFields({ mode }: Props): ReactElement {
  const {
    register,
    formState: { errors },
  } = useFormContext<SellerFormValues>();

  const optionalMinLength =
    (field: string): ((value: string) => true | string) =>
    (value: string) =>
      value.length === 0 || value.length >= 8 || `${field} must be at least 8 characters.`;

  const { ref: titleRef, ...titleField } = register("Title", {
    required: "Title is required.",
    minLength: minLengthRule("Title"),
  });

  const { ref: limitRef, ...limitField } = register("Limit", {
    valueAsNumber: true,
    required: "Limit is required.",
    validate: (value) =>
      (Number.isFinite(value) && value > 0) || "Limit must be a positive number.",
  });

  const { ref: usernameRef, ...usernameField } = register("Username", {
    required: "Username is required.",
    minLength: minLengthRule("Username"),
  });

  const passwordRules = {
    ...(mode === "add"
      ? { required: "Password is required.", minLength: minLengthRule("Password") }
      : { validate: optionalMinLength("Password") }),
  };
  const { ref: passwordRef, ...passwordField } = register("Password", passwordRules);

  const { ref: marzbanUsernameRef, ...marzbanUsernameField } = register("MarzbanUsername", {
    required: "Marzban Username is required.",
  });

  const { ref: marzbanPasswordRef, ...marzbanPasswordField } = register("MarzbanPassword", {
    required: mode === "add" ? "Marzban Password is required." : false,
  });

  return (
    <>
      <div className="row py-1 my-1">
        <div className="col-12 ">
          <TextField
            fullWidth
            id="seller-title"
            required
            label="Title"
            variant="outlined"
            inputRef={titleRef}
            {...titleField}
            error={Boolean(errors.Title)}
            helperText={errors.Title?.message}
          />
        </div>
      </div>
      <div className="row py-1 my-1">
        <div className="col-12 ">
          <TextField
            fullWidth
            id="seller-limit"
            required
            label="Limit(GB)"
            variant="outlined"
            type="number"
            inputRef={limitRef}
            {...limitField}
            error={Boolean(errors.Limit)}
            helperText={errors.Limit?.message}
          />
        </div>
      </div>
      <div className="row py-1 my-1">
        <div className="col-12 py-1 ">
          <TextField
            fullWidth
            id="seller-username"
            required
            label="Username"
            variant="outlined"
            inputRef={usernameRef}
            {...usernameField}
            error={Boolean(errors.Username)}
            helperText={errors.Username?.message}
          />
        </div>
      </div>
      <div className="row py-1 my-1">
        <div className="col-12 py-1">
          <TextField
            fullWidth
            id="seller-password"
            required={mode === "add"}
            label={mode === "add" ? "Password" : "New Password"}
            variant="outlined"
            type="password"
            autoComplete={mode === "add" ? "new-password" : "off"}
            inputRef={passwordRef}
            {...passwordField}
            error={Boolean(errors.Password)}
            helperText={errors.Password?.message}
          />
        </div>
      </div>
      <div className="row py-1 my-1">
        <div className="col-12 py-1 ">
          <TextField
            fullWidth
            id="seller-marzban-username"
            required
            label="Marzban Username"
            variant="outlined"
            inputRef={marzbanUsernameRef}
            {...marzbanUsernameField}
            error={Boolean(errors.MarzbanUsername)}
            helperText={errors.MarzbanUsername?.message}
          />
        </div>
      </div>
      <div className="row py-1 my-1">
        <div className="col-12 py-1">
          <TextField
            fullWidth
            id="seller-marzban-password"
            required={mode === "add"}
            label={mode === "add" ? "Marzban Password" : "New Marzban Password"}
            variant="outlined"
            type="password"
            autoComplete={mode === "add" ? "new-password" : "off"}
            inputRef={marzbanPasswordRef}
            {...marzbanPasswordField}
            error={Boolean(errors.MarzbanPassword)}
            helperText={errors.MarzbanPassword?.message}
          />
        </div>
      </div>
    </>
  );
}
