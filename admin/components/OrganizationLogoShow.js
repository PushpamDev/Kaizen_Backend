import React from "react";

const OrganizationLogoShow = (props) => {
    const { record } = props;
    const imageUrl = `/api/organization/logo`;

    return record.params.logo ? (
        <img src={imageUrl} alt="Organization Logo" style={{ maxWidth: "150px", maxHeight: "150px" }} />
    ) : (
        <span>No Logo Available</span>
    );
};

export default OrganizationLogoShow;
