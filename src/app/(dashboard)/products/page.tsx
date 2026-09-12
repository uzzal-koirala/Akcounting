import { listProducts } from "@/actions/products";
import { listContacts } from "@/actions/contacts";
import { ProductsPage } from "@/components/products-page";

export default async function Page() {
  const [products, contacts] = await Promise.all([listProducts(), listContacts()]);
  const customerNames = contacts.filter((contact) => contact.type === "Client").map((contact) => contact.name);
  return <ProductsPage initialProducts={products} customerNames={customerNames} />;
}
