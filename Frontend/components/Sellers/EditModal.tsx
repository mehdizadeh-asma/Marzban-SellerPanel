import type { FC, ReactElement } from "react";
import { useEffect } from "react";
import { Button, Modal } from "react-bootstrap";
import { FormProvider, useForm } from "react-hook-form";

import type SellerType from "@/models/SellerType";

import SellerFormFields, { type SellerFormValues } from "./SellerFormFields";

interface PropsType {
  isOpen: boolean;
  onClose: () => void;
  seller: SellerType | null;
  onEditing: (seller: SellerType) => void;
}

const EditModal: FC<PropsType> = ({ isOpen, onClose, seller, onEditing }): ReactElement | null => {
  const form = useForm<SellerFormValues>({
    defaultValues: {
      Title: seller?.Title ?? "",
      Limit: seller?.Limit ?? 0,
      Username: seller?.Username ?? "",
      Password: "",
      MarzbanUsername: seller?.MarzbanUsername ?? "",
      MarzbanPassword: "",
    },
  });

  useEffect(() => {
    form.reset({
      Title: seller?.Title ?? "",
      Limit: seller?.Limit ?? 0,
      Username: seller?.Username ?? "",
      Password: "",
      MarzbanUsername: seller?.MarzbanUsername ?? "",
      MarzbanPassword: "",
    });
  }, [form, seller]);

  const onSubmit = (values: SellerFormValues): void => {
    if (!seller) return;
    const updatedSeller: SellerType = {
      ...seller,
      Title: values.Title,
      Limit: values.Limit,
      Username: values.Username,
      MarzbanUsername: values.MarzbanUsername,
      Password: values.Password ? values.Password : seller.Password,
      MarzbanPassword: values.MarzbanPassword ? values.MarzbanPassword : seller.MarzbanPassword,
    };
    onEditing(updatedSeller);
  };

  const handleFormSubmit = form.handleSubmit(onSubmit);

  if (!isOpen || !seller) return null;

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
          Edit Agent :<label className="text-warning px-2">{seller?.Username}</label>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <FormProvider {...form}>
          <form
            id="seller-edit-form"
            onSubmit={(event): void => {
              void handleFormSubmit(event);
            }}
          >
            <SellerFormFields mode="edit" />
          </form>
        </FormProvider>
      </Modal.Body>
      <Modal.Footer className="justify-content-end">
        <Button variant="success" className="w100px" type="submit" form="seller-edit-form">
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
