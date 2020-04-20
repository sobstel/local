import { Button, List } from "antd";
import { useSelector } from "react-redux";

import { PlusOutlined, MinusOutlined } from "@ant-design/icons";

export default function Product(props: {
  id: string;
  onClick: (item: Product, op: "add" | "remove") => void;
}) {
  const { id, onClick } = props;

  const product = useSelector((state: any) => {
    const groupedProducts = state.products.groupedProducts as ProductsGroup[];
    for (const group of groupedProducts) {
      const product = group.products.find((product) => product.name === id);
      if (product) {
        return product;
      }
    }
    return null;
  });

  const lineItem = useSelector((state: any) => {
    const lineItems = (state.basket.items || []) as LineItem[];
    return lineItems.find((item) => item.name === id);
  });

  const inBasket = lineItem != null;

  return (
    <List.Item
      actions={[
        inBasket ? (
          <Button
            key="add"
            type="primary"
            shape="circle"
            size="large"
            icon={<MinusOutlined />}
            onClick={() => onClick(product, "remove")}
          />
        ) : undefined,
        <Button
          key="add"
          type="primary"
          shape="circle"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => onClick(product, "add")}
        />,
      ]}
    >
      <List.Item.Meta
        title={
          <div className={inBasket ? "tw-font-bold" : ""}>{product.name}</div>
        }
      />
      {inBasket && (
        <span className="tw-mr-2 tw-font-bold">{lineItem.count} x</span>
      )}
      <div>{product.price.toFixed(2)} zł</div>
    </List.Item>
  );
}
