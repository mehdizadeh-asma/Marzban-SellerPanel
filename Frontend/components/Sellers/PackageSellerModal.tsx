import { useRef } from "react";
import { Button, Modal } from "react-bootstrap";

import SellerType from "@/models/SellerType";

import PackagesGrid, { ForwardRefHandle } from "./PackagesGrid";

interface PropsType {
  onAssign: (seller: SellerType, tariffIdList: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
  seller: SellerType | undefined;
}

const PackageSellerModal = (props: PropsType) => {
  const gridRef = useRef<ForwardRefHandle>(null);

  const btnCancel_Click = () => {
    props.onClose();
  };

  const btnSave_Click = () => {
    if (gridRef.current) {
      const selectedTariffIds = gridRef.current.SendBackList();
      if (props.seller != null) props.onAssign(props.seller, selectedTariffIds);
    }
    props.onClose();
  };
  return (
    <Modal
      className="border border-1 shadow rounded-3  "
      show={props.isOpen}
      backdrop="static"
      keyboard={false}
      onHide={btnCancel_Click}
    >
      <Modal.Header closeButton className=" text-white bg-success">
        <Modal.Title>Assigned Packages</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <PackagesGrid ref={gridRef} seller={props.seller!}></PackagesGrid>
      </Modal.Body>
      <Modal.Footer className="justify-content-end">
        <Button variant="success" className="w100px" onClick={btnSave_Click}>
          Save
        </Button>
        <Button variant="dark" className="w100px" onClick={btnCancel_Click}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

PackageSellerModal.displayName = "PackageSellerModal";

export default PackageSellerModal;
