import type { ComponentRef, FC, ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";

import type SellerType from "@/models/SellerType";

import Messages from "../General/Messages";
import AddSeller from "./AddSeller";

interface PropsType {
  isOpen: boolean;
  onClose: () => void;
  seller: SellerType | null;
  onEditing: (seller: SellerType) => void;
}

const EditModal: FC<PropsType> = ({ isOpen, onClose, seller, onEditing }): ReactElement | null => {
  const [currentSeller, setCurrentSeller] = useState<SellerType | null>(seller);
  type MessagesHandle = ComponentRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);

  useEffect(() => {
    setCurrentSeller(seller);
  }, [seller]);

  const handleSave = (): void => {
    if (currentSeller) onEditing(currentSeller);
  };

  const handleFieldChange = (field: keyof SellerType, value: string | number): void => {
    let errorMessage = "";

    switch (field) {
      case "Title":
      case "Username":
      case "Password":
        if (typeof value === "string" && value.length < 8)
          errorMessage = `${field} Must Be Greater Than 8 Characters.`;
        break;

      case "Limit":
        if (Number(value) <= 0) errorMessage = "Limit is required and must be a positive number.";
        break;
    }

    if (errorMessage) {
      refMessages.current?.Show("error", errorMessage);
      return;
    }
    if (currentSeller) {
      setCurrentSeller({
        ...currentSeller,
        [field]: value,
      });
    }
  };
  if (!isOpen || !currentSeller) return null;

  return (
    <Modal
      className="border border-1 shadow rounded-3 "
      show={seller !== null}
      backdrop="static"
      keyboard={false}
      onHide={onClose}
    >
      <Modal.Header closeButton className=" text-white bg-success">
        <Modal.Title>
          Edit Agent :<label className="text-warning px-2">{currentSeller?.Username}</label>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Messages ref={refMessages}></Messages>
        <AddSeller
          onAdding={() => {}}
          onEditing={onEditing}
          mode="Edit"
          seller={seller}
          onFieldChange={handleFieldChange}
        />
      </Modal.Body>
      <Modal.Footer className="justify-content-end">
        <Button variant="success" className="w100px" onClick={handleSave}>
          Save
        </Button>
        <Button variant="dark" className="w100px" onClick={onClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

EditModal.displayName = "EditModal";

export default EditModal;
