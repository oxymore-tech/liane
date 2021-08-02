namespace Liane.Api.Matching
{
    public sealed class PassengerProposal
    {
        public PassengerProposal(string passengerId)
        {
            PassengerId = passengerId;
        }
        public string PassengerId { get; }
    }
}