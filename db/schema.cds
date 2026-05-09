namespace sap.cap.pr;
using { managed } from '@sap/cds/common';

type PrStatus: String enum{
    Draft = 'D';
    Submitted = 'S';
    Approved = 'A';
    Rejected = 'R';
    Cancelled = 'C';
}

type PrPriority: String enum{
    Low = '1';
    Medium = '2';
    High = '3';
    Critical = '4';
}

type WorkflowAction: String enum{
    Submitted = 'S';
    Approved = 'A';
    Rejected = 'R';
    Escalated = 'E';
}

entity PurchaseRequest: managed{
    key id: UUID;
    prNumber : String(10) not null;
    title : String(100) not null;
    description : String(500);
    status: PrStatus not null default 'D';  
    priority : PrPriority not null;
    justification : String(500);
    totalValue : Decimal(15,2);
    currency : String(3) default 'EUR';
    requiredDate : Date not null;
    plant : Association to Plant not null;
    costCenter : Association to CostCenter not null;
    requestedBy : String(50) not null;
    items: Composition of many PurchaseRequestItem on items.pr = $self;
    approvalLogs : Composition of many ApprovalLog on approvalLogs.pr = $self;
}

entity PurchaseRequestItem : managed{
    key ID: UUID;
    pr : Association to PurchaseRequest not null;
    lineNumber : Integer not null;
    material : Association to Material not null;
    supplier : Association to Supplier;
    quantity : Decimal(13,3) not null;
    unitOfMeasure : String(3) not null;
    unitPrice : Decimal(15,2) not null;
    totalPrice : Decimal(15,2);
    requiredDate: Date not null;
    notes: String(250);
}

entity Plant{
    key id : UUID;
    code : String(4);
    name : String(100);
    country : String(2);
    timezone : String(50);
    managerId : String(50);
}

entity CostCenter{
    key id: UUID;
    code : String(4);
    description: String(100);
    plant : Association to Plant not null;
    budget : Decimal(15,2);
    currency : String(3);
}

entity ApprovalLog: managed {
    key ID: UUID;
    pr: Association to PurchaseRequest not null;
    action: WorkflowAction not null;
    approverRole : String(50) not null;
    approvedBy : String(50) not null;
    comments: String(500);
    valueAtTime : Decimal(15,2);
}

entity Supplier {
    key id          : UUID;
    code            : String(10) not null;
    name            : String(100) not null;
    country         : String(2);
    contactEmail    : String(100);
    isPreferred     : Boolean default false;
    isActive        : Boolean default true;
}

entity Material {
    key id              : UUID;
    code                : String(10) not null;
    description         : String(100) not null;
    category            : String(50);
    unitOfMeasure       : String(3) not null;
    isCritical          : Boolean default false;
    preferredSupplier   : Association to Supplier;
}