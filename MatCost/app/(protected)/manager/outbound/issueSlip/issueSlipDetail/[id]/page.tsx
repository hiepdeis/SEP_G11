"use client";
import SharedIssueSlipDetail from "@/components/pages/outbound/issueslip-detail";
import { useParams } from "next/navigation";

export default function ManagerIssueSlipDetailPage() {
  const params = useParams();
  const issueId = Number(params?.id);
  
  return <SharedIssueSlipDetail role="manager" issueId={issueId} />;
}