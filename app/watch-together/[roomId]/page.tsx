import { WatchPartyRoom } from "@/components/watch-party-room";

type Props = { params: Promise<{ roomId: string }> };

export default async function WatchTogetherPage({ params }: Props) {
  const { roomId } = await params;
  return <main className="shell"><WatchPartyRoom roomId={roomId} /></main>;
}
