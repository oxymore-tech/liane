/* eslint-disable react/prop-types */
/* eslint-disable react/no-danger */
/* eslint-disable react/react-in-jsx-scope */
const JsonLd = ({ data }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
);

export default JsonLd;
