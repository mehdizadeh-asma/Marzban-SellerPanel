import type { ReactElement } from "react";
import { forwardRef, useImperativeHandle } from "react";
import { FormProvider, useForm } from "react-hook-form";

import type SellerType from "@/models/SellerType";

import SellerFormFields, { type SellerFormValues } from "./SellerFormFields";

interface PropsType {
  onAdding: (seller: SellerType) => void;
}

export type AddSellerHandle = {
  resetFields: () => void;
};

const defaultValues: SellerFormValues = {
  Title: "",
  Limit: 0,
  Username: "",
  Password: "",
  MarzbanUsername: "",
  MarzbanPassword: "",
};

const AddSeller = forwardRef<AddSellerHandle, PropsType>(
  ({ onAdding }: PropsType, ref): ReactElement | null => {
    const form = useForm<SellerFormValues>({
      defaultValues,
    });

    const onSubmit = (values: SellerFormValues): void => {
      const newseller: SellerType = {
        Title: values.Title,
        Limit: values.Limit,
        Username: values.Username,
        Password: values.Password,
        MarzbanUsername: values.MarzbanUsername,
        MarzbanPassword: values.MarzbanPassword,
      };

      onAdding(newseller);
    };

    const resetFields = (): void => {
      form.reset(defaultValues);
    };

    useImperativeHandle(ref, () => ({ resetFields }));

    const handleFormSubmit = form.handleSubmit(onSubmit);

    const style = "container  moduleContainerStyle moduleContainer py-2 rounded";
    return (
      <FormProvider {...form}>
        <form
          onSubmit={(event): void => {
            void handleFormSubmit(event);
          }}
        >
          <div className={`${style} w-75`}>
            <div></div>
            <SellerFormFields mode="add" />
            <div className="row">
              <div className="col-12 d-flex mt-1 mx-1 justify-content-center" id="divButton">
                <button
                  type="submit"
                  className="btn btnAdd w100px BgGrdColorizePurple text-white border-1 BorderPurple  "
                >
                  Save{" "}
                </button>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>
    );
  },
);
AddSeller.displayName = "Addseller";

export default AddSeller;
