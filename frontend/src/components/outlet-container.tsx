import type { PropsWithChildren } from "react";

function OutletContainer({ children }: PropsWithChildren) {
	return <div className="p-3 min-w-0 flex-1">{children}</div>;
}

export default OutletContainer;
