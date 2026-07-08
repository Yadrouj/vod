import { redirect } from "next/navigation";

export default function StoresPage() {
  redirect("/gyms?type=stores");
}
