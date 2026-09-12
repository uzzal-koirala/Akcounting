import { getCurrentPlan } from "@/actions/plan";
import { listDocuments, listDocumentCategories } from "@/actions/documents";
import { DocumentsPage } from "@/components/documents-page";

export default async function Page() {
  const [plan, documents, categories] = await Promise.all([getCurrentPlan(), listDocuments(), listDocumentCategories()]);
  return <DocumentsPage plan={plan} initialDocuments={documents} initialCategories={categories} />;
}
