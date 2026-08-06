import type { PropsWithChildren } from "react";

function OutletContainer({ children }: PropsWithChildren) {
	return <div className="p-3">{children}</div>;
}

export default OutletContainer;
