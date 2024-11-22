import SellerType from "@/models/SellerType";
import {
  useImperativeHandle,
  useState,
  forwardRef,
  useRef,
  useEffect,
  ElementRef,
} from "react";
import { Button, Modal } from "react-bootstrap";

import AddSeller from "./AddSeller";
import { propTypes } from "react-bootstrap/esm/Image";
import Messages from "../General/Messages";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller: SellerType | null; // The seller data to edit
  onEditing: (seller: SellerType) => void; // Update handler
}

interface ForwardRefHandle {
  Show: (seller: SellerType) => void;
  Hide: () => void;
}

const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  seller,
  onEditing,
}) => {
  const [currentSeller, setCurrentSeller] = useState<SellerType | null>(seller);
  type MessagesHandle = ElementRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);

  // Handle save button click
  useEffect(() => {
    setCurrentSeller(seller);
  }, [seller]);

  // Handle save button click
  const handleSave = () => {
    if (currentSeller) onEditing(currentSeller); // Pass updated seller to onEditing
  };

  const handleFieldChange = (
    field: keyof SellerType,
    value: string | number
  ) => {
    let errorMessage = "";

    switch (field) {
      case "Title":
      case "Username":
      case "Password":
        // Check if the field value is a string and has a length of at least 8 characters
        if (typeof value === "string" && value.length < 8) {
          errorMessage = `${field} Must Be Greater Than 8 Characters.`;
        }
        break;

      case "Limit":
        {
          console.log(value);

          // Check if the Limit is a number and is greater than 0
          if (Number(value) <= 0) {
            errorMessage = "Limit is required and must be a positive number.";
          }
        }
        break;

      default:
        break;
    }

    // Show the error message if one was set
    if (errorMessage) {
      refMessages.current?.Show("error", errorMessage);
      return; // Exit if there was an error
    }
    if (currentSeller) {
      console.log("in currentSeller");
      setCurrentSeller({
        ...currentSeller,
        [field]: value,
      });
    }
  };
  // Handle cancel button click
  const handleCancel = () => {
    onClose(); // Close the modal without changes
  };

  if (!isOpen || !currentSeller) return null;

  return (
    <Modal
      className="border border-1 shadow rounded-3 "
      show={seller !== null}
      backdrop="static"
      keyboard={false}
      onHide={handleCancel}
    >
      <Modal.Header closeButton className=" text-white bg-success">
        <Modal.Title>
          Edit Agent :
          <label className="text-warning px-2">{currentSeller?.Username}</label>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Messages ref={refMessages}></Messages>
        <AddSeller
          onAdding={() => {}} // AddSeller requires this prop, but we'll only use `onEditing`
          onEditing={onEditing}
          mode="Edit"
          seller={seller} // Pass selected seller to populate form
          onFieldChange={handleFieldChange}
        />
      </Modal.Body>
      <Modal.Footer className="justify-content-end">
        <Button variant="success" className="w100px" onClick={handleSave}>
          Save
        </Button>
        <Button variant="dark" className="w100px" onClick={handleCancel}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

EditModal.displayName = "EditModal";

export default EditModal;
