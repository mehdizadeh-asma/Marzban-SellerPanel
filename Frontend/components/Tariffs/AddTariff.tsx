import type { ReactElement } from "react";
import { Controller, useForm } from "react-hook-form";

import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";

import type TariffType from "@/models/TariffType";

interface PropsType {
  onAdding: (tariff: TariffType) => void;
}

type TariffFormValues = {
  Title: string;
  Duration: number;
  DataLimit: number;
  Price: number;
  IsFree: boolean;
  IsVisible: boolean;
};

export default function AddTariff(props: PropsType): ReactElement | null {
  const { register, handleSubmit, control, formState } = useForm<TariffFormValues>({
    defaultValues: {
      Title: "",
      Duration: 0,
      DataLimit: 0,
      Price: 0,
      IsFree: false,
      IsVisible: true,
    },
  });

  const { ref: titleRef, ...titleField } = register("Title", {
    required: "Title is required.",
    minLength: { value: 8, message: "Title must be at least 8 characters." },
  });

  const { ref: durationRef, ...durationField } = register("Duration", {
    valueAsNumber: true,
    required: "Duration is required.",
    validate: (value) => (Number.isFinite(value) && value > 0) || "Duration must be > 0.",
  });

  const { ref: dataLimitRef, ...dataLimitField } = register("DataLimit", {
    valueAsNumber: true,
    required: "DataLimit is required.",
    validate: (value) => (Number.isFinite(value) && value > 0) || "DataLimit must be > 0.",
  });

  const { ref: priceRef, ...priceField } = register("Price", {
    valueAsNumber: true,
    required: "Price is required.",
    validate: (value) => (Number.isFinite(value) && value >= 0) || "Price must be >= 0.",
  });

  const onSubmit = (data: TariffFormValues): void => {
    const tariff: TariffType = {
      Title: data.Title,
      DataLimit: data.DataLimit,
      Duration: data.Duration,
      Price: data.Price,
      IsFree: data.IsFree,
      IsVisible: data.IsVisible,
    };
    props.onAdding(tariff);
  };

  const handleFormSubmit = handleSubmit(onSubmit);

  return (
    <form
      onSubmit={(event): void => {
        void handleFormSubmit(event);
      }}
    >
      <div className="container  moduleContainerStyle moduleContainer py-2  rounded  ">
        <div className="row py-1 my-1">
          <div className="col-md-6 col-sm-12 py-1 ">
            <TextField
              fullWidth
              id="tariff-title"
              required
              label="Title"
              variant="outlined"
              inputRef={titleRef}
              {...titleField}
              error={Boolean(formState.errors.Title)}
              helperText={formState.errors.Title?.message}
            />
          </div>
          <div className="col-md-6 col-sm-12 py-1 ">
            <TextField
              fullWidth
              id="tariff-duration"
              required
              label="Duration"
              variant="outlined"
              type="number"
              inputRef={durationRef}
              {...durationField}
              error={Boolean(formState.errors.Duration)}
              helperText={formState.errors.Duration?.message}
            />
          </div>
        </div>
        <div className="row py-1 my-1">
          <div className="col-md-6 col-sm-12 py-1">
            <TextField
              fullWidth
              id="tariff-datalimit"
              required
              label="DataLimit"
              variant="outlined"
              type="number"
              inputRef={dataLimitRef}
              {...dataLimitField}
              error={Boolean(formState.errors.DataLimit)}
              helperText={formState.errors.DataLimit?.message}
            />
          </div>
          <div className="col-md-6 col-sm-12 py-1 ">
            <TextField
              fullWidth
              id="tariff-price"
              required
              label="Price"
              variant="outlined"
              type="number"
              inputRef={priceRef}
              {...priceField}
              error={Boolean(formState.errors.Price)}
              helperText={formState.errors.Price?.message}
            />
          </div>
          <div className="col-md-6 col-sm-12"></div>
        </div>
        <div className="row py-3 my-1">
          <div className="col-md-6 col-sm-12 py-1">
            <Controller
              name="IsVisible"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch sx={{ ml: 1 }} checked={field.value} onChange={field.onChange} />
                  }
                  label="Active?"
                />
              )}
            />
          </div>
          <div className="col py-1">
            <Controller
              name="IsFree"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch sx={{ ml: 1 }} checked={field.value} onChange={field.onChange} />
                  }
                  label="Is Free?"
                />
              )}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-12 d-flex mt-1 mx-1 justify-content-center" id="divButton">
            <button
              type="submit"
              className="btn btnAdd w100px BgGrdColorizePurple text-white border-1 BorderPurple  "
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
