import React, { useState } from "react";

const OrganizationLogoEdit = ({ property, record, onChange }) => {
    const [image, setImage] = useState(null);

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result);
                onChange(property.name, reader.result.split(",")[1]); // Extract Base64 data
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div>
            {image && <img src={image} alt="Preview" style={{ maxWidth: "150px", maxHeight: "150px" }} />}
            <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>
    );
};

export default OrganizationLogoEdit;
