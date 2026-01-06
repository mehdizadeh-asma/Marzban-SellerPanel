import { forwardRef, useImperativeHandle, useState, type ReactElement } from "react";
import { Button, Modal } from "react-bootstrap";
import { useForm } from "react-hook-form";

import type { AlertColor } from "@mui/material";

import { useSellerTariffs } from "@/hooks/useSellerTariffs";
import type TariffType from "@/models/TariffType";

interface PropsType {
  RenewHandler: (username: string, tariff: TariffType) => void;
  onMessage?: (severity: AlertColor, text: string) => void;
}

interface ForwardRefHandle {
  Show: (username: string) => void;
  Hide: () => void;
}

type RenewFormValues = {
  tariffId: string;
};

const RenewModal = forwardRef<ForwardRefHandle, PropsType>((props, ref): ReactElement | null => {
  const [username, setUsername] = useState("");
  const { tariffs } = useSellerTariffs(props.onMessage);

  const { register, handleSubmit, setError, reset, clearErrors, formState } =
    useForm<RenewFormValues>({
      defaultValues: {
        tariffId: "",
      },
    });

  useImperativeHandle(ref, () => ({
    Show: (nextUsername: string): void => {
      setUsername(nextUsername);
      reset({ tariffId: "" });
      clearErrors();
    },
    Hide: (): void => setUsername(""),
  }));

  const btnCancel_Click = (): void => {
    setUsername("");
    reset({ tariffId: "" });
    clearErrors();
  };

  const onSubmit = (data: RenewFormValues): void => {
    const tariff = tariffs.find((item) => item._id === data.tariffId);
    if (!data.tariffId) {
      setError("tariffId", { type: "validate", message: "Please select a package." });
      return;
    }
    if (!tariff) {
      setError("tariffId", { type: "validate", message: "Selected package not found." });
      return;
    }
    props.RenewHandler(username, tariff);
    setUsername("");
  };

  const handleFormSubmit = handleSubmit(onSubmit);

  return (
    <Modal
      className="border border-1 shadow rounded-3"
      show={username !== ""}
      backdrop="static"
      keyboard={false}
      onHide={btnCancel_Click}
    >
      <Modal.Header closeButton className=" text-white bg-success">
        <Modal.Title>
          Renew Account <label className="text-warning">{username}</label>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <form
          id="renew-form"
          onSubmit={(event): void => {
            void handleFormSubmit(event);
          }}
        >
          <select
            id="tariffList"
            className="rounded-2 border-secondary border-1  p-2  tariffDrop w-100"
            {...register("tariffId")}
          >
            <option value="">Select a package</option>
            {tariffs.map((tariff) => (
              <option key={tariff._id} value={tariff._id}>
                {tariff.Title}
              </option>
            ))}
          </select>
          {formState.errors.tariffId ? (
            <div className="text-danger mt-2">{formState.errors.tariffId.message}</div>
          ) : null}
        </form>
      </Modal.Body>
      <Modal.Footer className="justify-content-end">
        <Button variant="success" className="w100px" type="submit" form="renew-form">
          Renew
        </Button>
        <Button variant="dark" className="w100px" onClick={btnCancel_Click}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

RenewModal.displayName = "RenewModal";

export default RenewModal;
