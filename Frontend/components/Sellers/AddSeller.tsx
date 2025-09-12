import { ComponentRef, useEffect, useImperativeHandle, useRef, forwardRef, RefObject } from "react";

import TextField from "@mui/material/TextField";

import SellerType from "@/models/SellerType";

import Messages from "../General/Messages";

interface PropsType {
  onAdding: (seller: SellerType) => void;
  onEditing: (seller: SellerType) => void;
  mode: string;
  seller?: SellerType | null;
  onFieldChange: (field: keyof SellerType, value: string | number) => void;
}
const AddSeller = forwardRef(({ onAdding, onFieldChange, mode, seller }: PropsType, ref) => {
  const txtTitle = useRef<HTMLInputElement | null>(null);
  const txtUsername = useRef<HTMLInputElement | null>(null);
  const txtPassword = useRef<HTMLInputElement | null>(null);
  const txtLimit = useRef<HTMLInputElement | null>(null);
  const txtMarzbanUsername = useRef<HTMLInputElement | null>(null);
  const txtMarzbanPassword = useRef<HTMLInputElement | null>(null);

  type MessagesHandle = ComponentRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);

  useEffect(() => {
    if (seller && mode === "Edit") {
      txtTitle.current!.value = seller.Title;
      txtLimit.current!.value = seller.Limit.toString();
      txtUsername.current!.value = seller.Username;
      txtPassword.current!.value = seller.Password;
      txtMarzbanUsername.current!.value = seller.MarzbanUsername;
      txtMarzbanPassword.current!.value = seller.MarzbanPassword;
    }
  }, [seller, mode]);

  const handleInputChange = (field: keyof SellerType, ref: RefObject<HTMLInputElement | null>) => {
    if (ref.current) {
      onFieldChange(field, ref.current.value);
    }
  };

  const BtnAdd_Click = () => {
    if (!txtTitle.current || !txtTitle.current.value) {
      refMessages.current?.Show("error", "Title Is Required!");
      return;
    }

    if (txtTitle.current.value.length < 8) {
      refMessages.current?.Show("error", "Title Must Be Greater Than 8 Charecters!");
      return;
    }

    if (!txtLimit.current || !txtLimit.current.value || txtLimit.current.value === "") {
      refMessages.current?.Show("error", "Limit Is Required!");
      return;
    }

    if (!txtUsername.current || !txtUsername.current.value) {
      refMessages.current?.Show("error", "Username Is Required!");
      return;
    }

    if (txtUsername.current.value.length < 8) {
      refMessages.current?.Show("error", "Username Must Be Greater Then 8 Charecters!");
      return;
    }

    if (!txtPassword.current || !txtPassword.current.value) {
      refMessages.current?.Show("error", "Password Is Required!");
      return;
    }

    if (txtPassword.current.value.length < 8) {
      refMessages.current?.Show("error", "Password Must Be Greater Then 8 Charecters!");
      return;
    }

    if (!txtMarzbanUsername.current || !txtMarzbanUsername.current.value) {
      refMessages.current?.Show("error", "Marzban Username Is Required!");
      return;
    }

    if (!txtMarzbanPassword.current || !txtMarzbanPassword.current.value) {
      refMessages.current?.Show("error", "Marzban Password Is Required!");
      return;
    }
    const newseller: SellerType = {
      Title: txtTitle.current.value,
      Limit: +txtLimit.current.value,
      Username: txtUsername.current.value,
      Password: txtPassword.current.value,
      MarzbanUsername: txtMarzbanUsername.current.value,
      MarzbanPassword: txtMarzbanPassword.current.value,
    };

    onAdding(newseller);
  };
  const resetFields = () => {
    txtTitle.current!.value = "";
    txtUsername.current!.value = "";
    txtPassword.current!.value = "";
    txtLimit.current!.value = "";
    txtMarzbanUsername.current!.value = "";
    txtMarzbanPassword.current!.value = "";
  };

  useImperativeHandle(ref, () => ({
    resetFields,
  }));

  const style = "container  moduleContainerStyle moduleContainer py-2 rounded";
  return (
    <>
      <Messages ref={refMessages}></Messages>
      <div className={mode === "Add" ? style + " w-75" : style + " w-100"}>
        <div></div>
        <div className="row py-1 my-1">
          <div className="col-12 ">
            <TextField
              inputRef={txtTitle}
              fullWidth
              id="outlined-basic"
              required
              label="Title"
              variant="outlined"
              onChange={mode === "Edit" ? () => handleInputChange("Title", txtTitle) : () => {}}
            />
          </div>
        </div>
        <div className="row py-1 my-1">
          <div className="col-12 ">
            <TextField
              fullWidth
              id="outlined-basic"
              required
              label="Limit(GB)"
              variant="outlined"
              type="number"
              inputRef={txtLimit}
              onChange={mode === "Edit" ? () => handleInputChange("Limit", txtLimit) : () => {}}
            />
          </div>
        </div>
        <div className="row py-1 my-1">
          <div className="col-12 py-1 ">
            <TextField
              fullWidth
              id="outlined-basic"
              required
              label="Username"
              variant="outlined"
              inputRef={txtUsername}
              onChange={
                mode === "Edit" ? () => handleInputChange("Username", txtUsername) : () => {}
              }
            />
          </div>
        </div>
        <div className="row py-1 my-1">
          <div className="col-12 py-1">
            <TextField
              fullWidth
              id="outlined-basic"
              required
              label="Password"
              variant="outlined"
              inputRef={txtPassword}
              onChange={
                mode === "Edit" ? () => handleInputChange("Password", txtPassword) : () => {}
              }
            />
          </div>
        </div>
        <div className="row py-1 my-1">
          <div className="col-12 py-1 ">
            <TextField
              fullWidth
              id="outlined-basic"
              required
              label="Marzban Username"
              variant="outlined"
              inputRef={txtMarzbanUsername}
              onChange={
                mode === "Edit"
                  ? () => handleInputChange("MarzbanUsername", txtMarzbanUsername)
                  : () => {}
              }
            />
          </div>
        </div>
        <div className="row py-1 my-1">
          <div className="col-12 py-1">
            <TextField
              fullWidth
              id="outlined-basic"
              required
              label="Marzban Password"
              variant="outlined"
              inputRef={txtMarzbanPassword}
              onChange={
                mode === "Edit"
                  ? () => handleInputChange("MarzbanPassword", txtMarzbanPassword)
                  : () => {}
              }
            />
          </div>
        </div>
        <div className="row">
          <div className="col-12 d-flex mt-1 mx-1 justify-content-center" id="divButton">
            {mode === "Add" ? (
              <button
                onClick={BtnAdd_Click}
                className="btn btnAdd w100px BgGrdColorizePurple text-white border-1 BorderPurple  "
              >
                Save{" "}
              </button>
            ) : (
              ""
            )}
          </div>
        </div>
      </div>
    </>
  );
});
AddSeller.displayName = "Addseller";

export default AddSeller;
