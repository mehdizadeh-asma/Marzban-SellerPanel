"use client";
import axios, { AxiosError } from "axios";
import { ElementRef, useCallback, useEffect, useRef, useState } from "react";

import { useMyContext } from "@/context/MyContext";
import AddSeller from "./AddSeller";
import SellerGrid from "./SellerGrid";
import SellerType from "@/models/SellerType";
import Messages from "../General/Messages";
import EditModal from "./EditModal";
import PackageSellerModal from "./PackageSellerModal";

const SellerManagement = () => {
  const { user, config } = useMyContext();
  const [sellerList, setSellerList] = useState<SellerType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerType | null>(null); // Track the seller being edited
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isAssignPackagesModalOpen, setAssignPackagesModalOpen] =
    useState(false);

  type MessagesHandle = ElementRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);
  const addSellerRef = useRef<AddSellerHandle | null>(null);

  type AddSellerHandle = {
    resetFields: () => void;
  };
  const LaodSeller = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("api/sellers", config.BACKEND_URL);
      const resultSellers = await axios.get(url.toString(), {
        headers: { Authorization: "Bearer " + user.Token },
      });
      setSellerList(resultSellers.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [config.BACKEND_URL, user.Token]);

  useEffect(() => {
    if (user.Token !== "") LaodSeller();
  }, [LaodSeller, user.Token]);

  const onDeleteClick = async (seller: SellerType) => {
    setLoading(true);
    try {
      const url = new URL("api/seller/" + seller._id, config.BACKEND_URL);

      await axios.delete(url.toString(), {
        headers: { Authorization: "Bearer " + user.Token },
      });
      refMessages.current?.Show("success", "Agent Delete Successful!");
    } catch (error) {
      console.log(error);
    } finally {
      LaodSeller();
    }
  };
  const resetAddSellerFields = () => {
    addSellerRef.current?.resetFields();
  };
  const onEditClick = (seller: SellerType) => {
    resetAddSellerFields();
    setSelectedSeller(seller); // Set the selected seller for editing
    setEditModalOpen(true); // Open modal
  };

  const onUpdateClick = async (seller: SellerType) => {
    console.log("seller in update");
    console.log(seller);

    setLoading(true);
    try {
      const url = new URL("api/seller/" + seller._id, config.BACKEND_URL);

      await axios.put(url.toString(), seller, {
        headers: { Authorization: "Bearer " + user.Token },
      });
      refMessages.current?.Show("success", "Agent Updated Successfully!");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const axiosError = error as AxiosError;
        console.log(axiosError);
        if (axiosError.response) {
          const statusCode = axiosError.response.status;

          if (statusCode === 404) {
            refMessages.current?.Show(
              "error",
              "Invalid Marzban Account Information"
            );
          }
        } else {
          const errorMessage =
            error.response?.data?.message || // Standard message
            error.response?.data?.error || // Custom error field
            "Update Failed, An error occurred";
          refMessages.current?.Show("error", errorMessage);
          console.log("No response received:", axiosError.message);
          refMessages.current?.Show("error", "No response from the server.");
        }
      } else {
        console.log("Unknown error:", error);
        refMessages.current?.Show("error", "An unknown error occurred.");
      }
    } finally {
      setSelectedSeller(null);
      setEditModalOpen(false); // Close modal after update
      LaodSeller();
    }
  };

  const onAddClick = async (seller: SellerType) => {
    setLoading(true);
    try {
      const url = new URL("api/seller", config.BACKEND_URL);

      await axios.post(url.toString(), seller, {
        headers: { Authorization: "Bearer " + user.Token },
      });
      refMessages.current?.Show("success", "Agent Inserted Successfully!");
      addSellerRef.current?.resetFields();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const statusCode = axiosError.response.status;

          if (statusCode === 404) {
            refMessages.current?.Show(
              "error",
              "Invalid Marzban Account Information"
            );
          } else {
            console.log("Internal Server Error : ", error);
            refMessages.current?.Show(
              "error",
              "Internal Server Error! Please try again later."
            );
          }
        } else {
          console.log("No response received:", axiosError.message);
          refMessages.current?.Show("error", "No response from the server.");
        }
      } else {
        console.log("Unknown error:", error);
        refMessages.current?.Show("error", "An unknown error occurred.");
      }
    } finally {
      LaodSeller();
    }
  };
  const onDisableAccountClick = async (seller: SellerType) => {
    setLoading(true);
    try {
      const url = new URL(
        "api/disableseller/" + seller._id,
        config.BACKEND_URL
      );

      await axios.post(
        url.toString(),
        {},
        {
          headers: { Authorization: "Bearer " + user.Token },
        }
      );
      refMessages.current?.Show("success", "Agent Change Successful!");
    } catch (error) {
      console.log(error);
    } finally {
      LaodSeller();
    }
  };
  // #region AssignPackages
  const onAssignPackagesClick = async (seller: SellerType) => {
    setSelectedSeller(seller); // Set the selected seller for editing
    setAssignPackagesModalOpen(true); // Open modal
  };

  const onSavePackageClick = async (
    seller: SellerType,
    packagesListIds: string[]
  ) => {
    console.log("packagesListIds in ");
    console.log(packagesListIds);
    setLoading(true);
    try {
      const url = new URL("api/tariffSeller/" + seller._id, config.BACKEND_URL);
      await axios.put(
        url.toString(),
        { TariffIds: packagesListIds },
        {
          headers: { Authorization: "Bearer " + user.Token },
        }
      );

      refMessages.current?.Show(
        "success",
        "Packages Assigned to Seller Successfully!"
      );
    } catch (error) {
      console.error(error);
      refMessages.current?.Show(
        "error",
        "An error occurred while assigning packages to the seller."
      );
    } finally {
      setLoading(false);
      LaodSeller(); // Reloads the seller data
    }
  };
  //#endregion

  return (
    <div className="row w-100 border border-solid-1 border-secondary.light rounded py-2">
      <div className="col-12">
        <Messages ref={refMessages}></Messages>
        <AddSeller
          ref={addSellerRef}
          onAdding={onAddClick}
          onEditing={onEditClick}
          mode={"Add"}
          onFieldChange={() => {}}
        ></AddSeller>
        <SellerGrid
          Sellers={sellerList}
          Loading={loading}
          onDeleting={onDeleteClick}
          onEditing={onEditClick}
          onDisableAccount={onDisableAccountClick}
          onAssignPackages={onAssignPackagesClick}
        />
      </div>
      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        seller={selectedSeller}
        onEditing={onUpdateClick}
      />
      {selectedSeller != null ? (
        <PackageSellerModal
          isOpen={isAssignPackagesModalOpen}
          onClose={() => setAssignPackagesModalOpen(false)}
          seller={selectedSeller}
          onAssign={onSavePackageClick}
        />
      ) : (
        ""
      )}
    </div>
  );
};

export default SellerManagement;
