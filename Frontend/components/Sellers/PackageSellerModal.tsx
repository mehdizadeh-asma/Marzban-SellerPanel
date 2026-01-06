import type { ReactElement } from "react";
import { useRef } from "react";
import { Button, Modal } from "react-bootstrap";

import type { AlertColor } from "@mui/material";

import type SellerType from "@/models/SellerType";

import type { ForwardRefHandle } from "./PackagesGrid";
import PackagesGrid from "./PackagesGrid";

interface PropsType {
  onAssign: (seller: SellerType, tariffIdList: string[]) => void;
  isOpen: boolean;
  onClose: () => void;
  seller: SellerType | undefined;
  onMessage?: (severity: AlertColor, text: string) => void;
}

const PackageSellerModal = (props: PropsType): ReactElement | null => {
  const gridRef = useRef<ForwardRefHandle>(null);

  const btnCancel_Click = (): void => {
    props.onClose();
  };

  const btnSave_Click = (): void => {
    if (gridRef.current) {
      const selectedTariffIds = gridRef.current.SendBackList();
      if (props.seller != null) props.onAssign(props.seller, selectedTariffIds);
    }
    props.onClose();
  };

  const packagesGridProps = props.onMessage ? { onMessage: props.onMessage } : {};
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
        <PackagesGrid ref={gridRef} seller={props.seller!} {...packagesGridProps} />
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
