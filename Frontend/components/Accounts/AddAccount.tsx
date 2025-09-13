"use client";
import axios from "axios";
import { forwardRef, useEffect, useRef, useState } from "react";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";

import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";

import { useMyContext } from "@/context/MyContext";
import type TariffType from "@/models/TariffType";

interface PropsType {
  onAdding?: (tariff: TariffType, note: string, onHold: boolean) => void;
  StartLoading?: () => void;
  EndLoading?: () => void;
  ref?: React.Ref<HTMLSelectElement>;
  Mode: string;
  Loading: boolean;
}

const AddAccount = forwardRef<HTMLSelectElement, PropsType>((props, ref) => {
  const { user, config } = useMyContext();

  const [tariffList, setTariffList] = useState<TariffType[]>([]);
  const selectTariff = useRef<HTMLSelectElement | null>(null);
  const txtNote = useRef<HTMLInputElement | null>(null);
  const chkOnHold = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const LaodTariff = async (): Promise<void> => {
      try {
        const url = new URL(`api/tariffs/false/${user.Username}`, config.BACKEND_URL);
        const resultTariff = await axios.get(url.toString(), {
          headers: { Authorization: "Bearer " + user.Token },
        });
        setTariffList(resultTariff.data);
      } catch (error) {
        console.log(error);
      }
    };
    if (user.Token !== "") LaodTariff();
  }, [config.BACKEND_URL, user.Token, user.Username]);

  const BtnAdd_Click = async (): Promise<void> => {
    let note = "";
    let onHold = false;

    props.StartLoading?.();

    if (txtNote.current && txtNote.current.value) {
      note = txtNote.current.value;
      txtNote.current.value = "";
    }

    if (chkOnHold.current) {
      onHold = chkOnHold.current.checked;
    }

    if (selectTariff.current) {
      const tariffId = selectTariff.current?.value;

      const tariff = tariffList.filter((t) => t._id == tariffId)[0];

      if (props.onAdding) props.onAdding(tariff, note, onHold);
    }
  };

  const FillTariffs = (): React.ReactNode => {
    if (tariffList && tariffList.length > 0) {
      return tariffList.map((tariff: TariffType) => {
        return (
          <option key={tariff?._id} value={tariff?._id}>
            {tariff?.Title}
          </option>
        );
      });
    }
    return null;
  };

  return props.Mode == "Add" ? (
    <div className="row w-100 py-3 border BorderPurple">
      <div className="col-sm-12 col-md-6 col-lg-6 col-xl-4 d-inline-flex ">
        <select
          name="tariffList"
          id="tariffList"
          className="rounded-2  border-1 p-2  tariffDrop w-100 mx-2"
          ref={selectTariff}
        >
          {FillTariffs()}
        </select>
        <TextField id="outlined-basic" label="Note" variant="outlined" inputRef={txtNote} />
        <FormControlLabel
          control={<Checkbox inputRef={chkOnHold} />}
          label="OnHold"
          className="mx-2"
        />
      </div>
      <div className="col-sm-12 col-md-6 col-lg-6 col-xl-4 divButton py-2">
        <Button
          onClick={BtnAdd_Click}
          disabled={props.Loading}
          className="btn btnAdd  BgGrdColorizePurple text-white border-1 BorderPurple h-75 "
        >
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
            className={props.Loading ? "mx-1" : "visually-hidden"}
          />
          {props.Loading ? "" : "Add"}
        </Button>
      </div>
    </div>
  ) : (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12  justify-content-start d-flex mt-1 mx-1" id="divDrop">
          <select
            name="tariffList"
            id="tariffList"
            className="rounded-2 border-secondary border-1  p-2  tariffDrop w-100"
            ref={ref}
          >
            {FillTariffs()}
          </select>
          {/*<TextField
            id="outlined-basic"
            label="Note"
            variant="outlined"
            className="mx-1"
          />
          <FormControlLabel
            control={<Checkbox inputRef={chkOnHold} />}
            label="OnHold"
            className="mx-2"
          /> */}
        </div>
      </div>
    </div>
  );
});

AddAccount.displayName = "AddAccount";

export default AddAccount;
