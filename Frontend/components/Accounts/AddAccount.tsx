"use client";
import axios from "axios";
import { forwardRef, useEffect, useRef, useState } from "react";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";

import { useMyContext } from "@/context/MyContext";
import TariffType from "@/models/TariffType";

interface PropsType {
  onAdding?: (tariff: TariffType, note: string, onHold: boolean) => void;
  Mode: string;
}

const AddAccount = forwardRef<HTMLSelectElement, PropsType>((props, ref) => {
  const { user, config } = useMyContext();
  const [tariffList, setTariffList] = useState<TariffType[]>([]);
  const selectTariff = useRef<HTMLSelectElement | null>(null);
  const txtNote = useRef<HTMLInputElement | null>(null);
  const chkOnHold = useRef<HTMLInputElement | null>(null); // Reference for the checkbox

  useEffect(() => {
    const LaodTariff = async () => {
      try {
        const url = new URL("api/tariffs/false", config.BACKEND_URL);
        const resultTariff = await axios.get(url.toString());
        const sortedTarrif = (resultTariff.data as TariffType[]).sort(
          (a, b) => {
            if (a.Title > b.Title) return -1;
            else return 1;
          }
        );
        setTariffList(resultTariff.data);
      } catch (error) {
        console.log(error);
      }
    };
    if (user.Token !== "") LaodTariff();
  }, [config.BACKEND_URL, user.Token]);

  const BtnAdd_Click = async () => {
    let note = "";
    let onHold = false;

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

      if (props.onAdding) props.onAdding(tariff, note, onHold); // Pass the onHold value to the onAdding function
    }
  };

  const FillTariffs = () => {
    if (tariffList)
      return tariffList.map((tariff: TariffType) => {
        return (
          <option key={tariff?._id} value={tariff?._id}>
            {tariff?.Title}
          </option>
        );
      });
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
        <TextField
          id="outlined-basic"
          label="Note"
          variant="outlined"
          inputRef={txtNote}
        />
        <FormControlLabel
          control={<Checkbox inputRef={chkOnHold} />}
          label="OnHold"
          className="mx-2"
        />
      </div>
      <div className="col-sm-12 col-md-6 col-lg-6 col-xl-4 divButton py-2">
        <button
          onClick={BtnAdd_Click}
          className="btn btnAdd  BgGrdColorizePurple text-white border-1 BorderPurple h-75 "
        >
          Add
        </button>
      </div>
    </div>
  ) : (
    <div className="container-fluid">
      <div className="row">
        <div
          className="col-12  justify-content-start d-flex mt-1 mx-1"
          id="divDrop"
        >
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
