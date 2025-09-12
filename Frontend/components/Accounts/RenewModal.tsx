import { useImperativeHandle, useState, forwardRef, useRef } from "react";
import { Button, Modal } from "react-bootstrap";

import AddAccount from "./AddAccount";

interface PropsType {
  RenewHandler: (username: string, tariffId: string) => void;
}

interface ForwardRefHandle {
  Show: (username: string) => void;
  Hide: () => void;
}

const RenewModal = forwardRef<ForwardRefHandle, PropsType>((props, ref) => {
  const [username, setUsername] = useState("");
  const selectTariff = useRef<HTMLSelectElement | null>(null);

  useImperativeHandle(ref, () => ({
    Show: (username: string) => {
      setUsername(username);
    },
    Hide: () => setUsername(""),
  }));

  const btnCancel_Click = () => {
    setUsername("");
  };

  const btnRenew_Click = async () => {
    if (selectTariff.current) props.RenewHandler(username, selectTariff.current.value);
    setUsername("");
  };

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
        <AddAccount Mode="Renew" Loading={false} ref={selectTariff} />
      </Modal.Body>
      <Modal.Footer className="justify-content-end">
        <Button variant="success" className="w100px" onClick={btnRenew_Click}>
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
