interface JsonLdProps {
  data:any;
}

const JsonLd = ({ data } : JsonLdProps) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
);

export default JsonLd;