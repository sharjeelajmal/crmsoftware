// Browser-side events used to keep distant components in sync without prop drilling.
export const PROFILE_UPDATED_EVENT = "aj:profile-updated";

export const emitProfileUpdated = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
};
