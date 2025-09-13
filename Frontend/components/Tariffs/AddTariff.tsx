import type { ComponentRef, ReactElement } from "react";
import { useRef, useState } from "react";

import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";

import type TariffType from "@/models/TariffType";

import Messages from "../General/Messages";

interface PropsType {
  onAdding: (seller: TariffType) => void;
}

export default function AddTariff(props: PropsType): ReactElement | null {
  const txtTitle = useRef<HTMLInputElement | null>(null);
  const txtDuration = useRef<HTMLInputElement | null>(null);
  const txtDataLimit = useRef<HTMLInputElement | null>(null);
  const txtPrice = useRef<HTMLInputElement | null>(null);

  const [isFree, setIsFree] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  type MessagesHandle = ComponentRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);

  const BtnAdd_Click = (): void => {
    if (!txtTitle.current || !txtTitle.current.value) {
      refMessages.current?.Show("error", "Title Is Required!");
      return;
    }

    if (txtTitle.current.value.length < 8) {
      refMessages.current?.Show("error", "Title Greater Then 8 Charecters!");
      return;
    }

    if (!txtDataLimit.current || !txtDataLimit.current.value || txtDataLimit.current.value === "") {
      refMessages.current?.Show("error", "DataLimit Is Required!");
      return;
    }

    if (!txtDuration.current || !txtDuration.current.value || txtDuration.current.value === "") {
      refMessages.current?.Show("error", "Duration Is Required!");
      return;
    }

    if (!txtPrice.current || !txtPrice.current.value || txtPrice.current.value === "") {
      refMessages.current?.Show("error", "Price Is Required!");
      return;
    }

    const title = txtTitle.current.value;
    const datalimit = +txtDataLimit.current.value;
    const duration = +txtDuration.current.value;
    const price = +txtPrice.current.value;

    const tariff: TariffType = {
      Title: title,
      DataLimit: datalimit,
      Duration: duration,
      Price: price,
      IsFree: isFree,
      IsVisible: isVisible,
    };
    props.onAdding(tariff);
  };

  return (
    <>
      <Messages ref={refMessages}></Messages>
      <div className="container  moduleContainerStyle moduleContainer py-2  rounded  ">
        <div className="row py-1 my-1">
          <div className="col-md-6 col-sm-12 py-1 ">
            <TextField
              fullWidth
              id="outlined-basic"
              required
              label="Title"
              variant="outlined"
              inputRef={txtTitle}
            />
          </div>
          <div className="col-md-6 col-sm-12 py-1 ">
            <TextField
              fullWidth
              id="outlined-basic"
              required
              label="Duration"
              variant="outlined"
              type="number"
              inputRef={txtDuration}
            />
          </div>
        </div>
        <div className="row py-1 my-1">
          <div className="col-md-6 col-sm-12 py-1">
            <TextField
              fullWidth
              id="outlined-basic"
              required
              label="DataLimit"
              variant="outlined"
              type="number"
              inputRef={txtDataLimit}
            />
          </div>
          <div className="col-md-6 col-sm-12 py-1 ">
            <TextField
              fullWidth
              id="outlined-basic"
              required
              label="Price"
              variant="outlined"
              inputRef={txtPrice}
            />
          </div>
          <div className="col-md-6 col-sm-12"></div>
        </div>
        <div className="row py-3 my-1">
          <div className="col-md-6 col-sm-12 py-1">
            <FormControlLabel
              control={
                <Switch
                  sx={{ ml: 1 }}
                  checked={isVisible}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setIsVisible(e.target.checked);
                  }}
                />
              }
              label="Active?"
            />
          </div>
          <div className="col py-1">
            <FormControlLabel
              control={
                <Switch
                  sx={{ ml: 1 }}
                  checked={isFree}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setIsFree(e.target.checked);
                  }}
                />
              }
              label="Is Free?"
            />
          </div>
        </div>

        <div className="row">
          <div className="col-12 d-flex mt-1 mx-1 justify-content-center" id="divButton">
            <button
              onClick={BtnAdd_Click}
              className="btn btnAdd w100px BgGrdColorizePurple text-white border-1 BorderPurple  "
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
