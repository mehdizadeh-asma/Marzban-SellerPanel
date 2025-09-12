import { forwardRef, useImperativeHandle, useState } from "react";

import { AlertColor } from "@mui/material";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Zoom from "@mui/material/Zoom";

interface ForwardRefHandle {
  Show: (severity: AlertColor, text: string) => void;
  Hide: () => void;
}

interface MessageType {
  Open?: boolean;
  Severity?: AlertColor;
  Text?: string;
}

const Messages = forwardRef<ForwardRefHandle, object>((_props, ref) => {
  const [message, setMessage] = useState<MessageType>({
    Open: false,
    Severity: "error",
    Text: "",
  });

  useImperativeHandle(ref, () => ({
    Show: (severity: AlertColor, text: string) => {
      setMessage({ Severity: severity, Text: text, Open: true });
    },
    Hide: () => setMessage({ ...message, Open: false }),
  }));

  return (
    <Zoom in={message.Open} style={{ transitionDelay: "500ms" }}>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={6000}
        open={message.Open}
        onClose={() => {
          setMessage({ ...message, Open: false });
        }}
      >
        <Alert variant="filled" severity={message.Severity}>
          {message.Text}
        </Alert>
      </Snackbar>
    </Zoom>
  );
});
Messages.displayName = "Messages";

export default Messages;
