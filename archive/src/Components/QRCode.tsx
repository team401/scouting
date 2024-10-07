import React from "react";
import QRCode from "react-qr-code";
type qrprops = {
  value: string;
};
export default function QR(props: qrprops) {
  return (
    <div className="bg-white text-black rounded-xl p-10 mt-5 shadow-lg w-full h-full flex flex-col items-center">
      <QRCode
        size={256}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        value={props.value}
        viewBox={`0 0 256 256`}
      />
    </div>
  );
}
