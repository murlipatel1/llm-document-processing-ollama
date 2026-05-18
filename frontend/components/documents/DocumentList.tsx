import ProcessingBadge from "./ProcessingBadge";

type DocumentItem = {
  id: string;
  filename: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
};

type Props = {
  items: DocumentItem[];
};

export default function DocumentList({ items }: Props) {
  if (!items.length) {
    return <p className="subtext">No documents uploaded yet.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th align="left">File</th>
            <th align="left">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.filename}</td>
              <td>
                <ProcessingBadge status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
