"use client";
import { useMemo, type ReactElement } from "react";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { useForm } from "react-hook-form";

import type { AlertColor } from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";

import { useSellerTariffs } from "@/hooks/useSellerTariffs";
import type TariffType from "@/models/TariffType";

interface PropsType {
  onAdding?: (tariff: TariffType, note: string, onHold: boolean) => void;
  Loading: boolean;
  onMessage?: (severity: AlertColor, text: string) => void;
}

type AddAccountFormValues = {
  tariffId: string;
  note: string;
  onHold: boolean;
};

const AddAccount = (props: PropsType): ReactElement => {
  const { tariffs } = useSellerTariffs(props.onMessage);

  const { register, handleSubmit, setError, reset, formState } = useForm<AddAccountFormValues>({
    defaultValues: {
      tariffId: "",
      note: "",
      onHold: false,
    },
  });

  const { ref: noteRef, ...noteField } = register("note");
  const { ref: onHoldRef, ...onHoldField } = register("onHold");

  const tariffOptions = useMemo(() => {
    if (!tariffs.length) return null;
    return tariffs.map((tariff) => (
      <option key={tariff?._id} value={tariff?._id}>
        {tariff?.Title}
      </option>
    ));
  }, [tariffs]);

  const onSubmit = (data: AddAccountFormValues): void => {
    const tariff = tariffs.find((t) => t._id === data.tariffId);
    if (!data.tariffId) {
      setError("tariffId", { type: "validate", message: "Please select a tariff." });
      return;
    }
    if (!tariff) {
      setError("tariffId", { type: "validate", message: "Selected tariff not found." });
      return;
    }

    props.onAdding?.(tariff, data.note ?? "", data.onHold ?? false);
    reset({ tariffId: data.tariffId, note: "", onHold: false });
  };

  const handleFormSubmit = handleSubmit(onSubmit);

  return (
    <form
      onSubmit={(event): void => {
        void handleFormSubmit(event);
      }}
    >
      <div className="row w-100 py-3 border BorderPurple">
        <div className="col-sm-12 col-md-6 col-lg-6 col-xl-4 d-inline-flex ">
          <select
            id="tariffList"
            className="rounded-2  border-1 p-2  tariffDrop w-100 mx-2"
            {...register("tariffId")}
          >
            <option value="">Select a tariff</option>
            {tariffOptions}
          </select>
          <TextField
            id="outlined-basic"
            label="Note"
            variant="outlined"
            inputRef={noteRef}
            {...noteField}
            error={Boolean(formState.errors.note)}
            helperText={formState.errors.note?.message}
          />
          <FormControlLabel
            control={<Checkbox inputRef={onHoldRef} {...onHoldField} />}
            label="OnHold"
            className="mx-2"
          />
        </div>
        <div className="col-sm-12 col-md-6 col-lg-6 col-xl-4 divButton py-2">
          <Button
            type="submit"
            disabled={props.Loading}
            className="btn btnAdd  BgGrdColorizePurple text-white border-1 BorderPurple h-75 "
          >
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
              className={props.Loading ? "mx-1" : "visually-hidden"}
            />
            {props.Loading ? "" : "Add"}
          </Button>
          {formState.errors.tariffId ? (
            <div className="text-danger mt-2">{formState.errors.tariffId.message}</div>
          ) : null}
        </div>
      </div>
    </form>
  );
};

export default AddAccount;
